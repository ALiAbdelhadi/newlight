/**
 * Inventory and order reporting — BUILD §13.
 *
 * Every number here is derived from the ledger, never from a cached column, which is the
 * point of having a ledger: "why is this 3 and not 5" has an answer you can read.
 *
 * ONE RULE RUNS THROUGH ALL OF IT: while `inventory.opening_count_pending` is set, stock
 * valuation and margin render "opening count pending" rather than a number (N1). All 189
 * opening balances are a seeded placeholder of 5000 with no cost, so any valuation computed
 * from them is fiction — and a fiction with a currency symbol on it is worse than a blank.
 * `unitCost` is nullable and NEVER zero for the same reason: treating a null cost as 0
 * silently reports 100% margin.
 */
import type { PrismaClient } from "@prisma/client"
import { DEFAULT_LOCATION_ID, OPENING_COUNT_PENDING_KEY } from "./inventory"
import { money, serializeMoney, type SerializedMoney } from "./money"

/**
 * A date boundary for raw SQL, as a UTC wall-clock string.
 *
 * Every timestamp column in this schema is `timestamp(3) WITHOUT time zone`, and Prisma writes
 * UTC into them. A JS Date passed as a raw parameter arrives as a timestamptz, so comparing it
 * to one of those columns coerces through the SESSION timezone — on a server set to
 * Africa/Cairo the boundary lands three hours out and the filter matches nothing, silently.
 *
 * `'...'::timestamp` drops the zone and gives the UTC wall clock, which is exactly what is
 * stored. Timezone-independent, and it does not depend on how the driver types a Date.
 *
 * Two reports were quietly returning empty and one was listing every product as dead stock
 * before a test caught it.
 */
function utcBoundary(date: Date): string {
    return date.toISOString().replace("T", " ").replace("Z", "")
}

/** Either a number, or an honest refusal to give one. */
export type Valuation =
    | { available: true; value: SerializedMoney }
    | { available: false; reason: "opening-count-pending" | "cost-not-recorded" }

export async function isOpeningCountPending(prisma: PrismaClient): Promise<boolean> {
    const flag = await prisma.systemSetting.findUnique({ where: { key: OPENING_COUNT_PENDING_KEY } })
    return flag?.value === "true"
}

/**
 * Stock valuation at weighted average cost.
 *
 * Refuses while the opening count is pending, and refuses again if any product carries stock
 * with no recorded cost — a partial valuation presented as a total is a wrong number.
 */
export async function stockValuation(
    prisma: PrismaClient,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<Valuation> {
    if (await isOpeningCountPending(prisma)) {
        return { available: false, reason: "opening-count-pending" }
    }

    const rows = await prisma.$queryRaw<Array<{ onHand: number; averageCost: string | null }>>`
        SELECT l."onHand", p."averageCost"::text AS "averageCost"
          FROM stock_levels l
          JOIN products p ON p.id = l."productId"
         WHERE l."locationId" = ${locationId} AND l."onHand" > 0`

    if (rows.some((row) => row.averageCost === null)) {
        return { available: false, reason: "cost-not-recorded" }
    }

    const total = rows.reduce(
        (sum, row) => sum.plus(money(row.averageCost ?? "0").times(row.onHand)),
        money(0)
    )
    return { available: true, value: serializeMoney(total) }
}

/** The ledger for one product, newest first — the "why is this 3" answer. */
export async function movementHistory(prisma: PrismaClient, productId: string, limit = 100) {
    return prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { location: { select: { name: true } } },
    })
}

/**
 * Where the stored level disagrees with the sum of its movements.
 *
 * Should always be empty: `inventory.ts` writes both in one transaction. A non-empty result
 * means something wrote `stock_levels` directly, which is the single thing that module exists
 * to prevent — so this is the check that proves it is still true.
 */
export async function stocktakeVariance(prisma: PrismaClient, locationId: string = DEFAULT_LOCATION_ID) {
    return prisma.$queryRaw<Array<{ sku: string; ledger: number; stored: number; variance: number }>>`
        SELECT p."productId" AS sku,
               COALESCE(m.total, 0)::int AS ledger,
               l."onHand" AS stored,
               (l."onHand" - COALESCE(m.total, 0))::int AS variance
          FROM stock_levels l
          JOIN products p ON p.id = l."productId"
          LEFT JOIN (
              SELECT "productId", sum(quantity) AS total
                FROM stock_movements
               WHERE "locationId" = ${locationId}
               GROUP BY "productId"
          ) m ON m."productId" = l."productId"
         WHERE l."locationId" = ${locationId}
           AND l."onHand" <> COALESCE(m.total, 0)
         ORDER BY abs(l."onHand" - COALESCE(m.total, 0)) DESC`
}

/** Units sold per SKU over a window, from SALE movements (which are negative). */
export async function sellThrough(prisma: PrismaClient, since: Date, limit = 50) {
    return prisma.$queryRaw<Array<{ sku: string; unitsSold: number }>>`
        SELECT p."productId" AS sku, (-sum(m.quantity))::int AS "unitsSold"
          FROM stock_movements m
          JOIN products p ON p.id = m."productId"
         WHERE m.type = 'SALE' AND m."createdAt" >= ${utcBoundary(since)}::timestamp
         GROUP BY p."productId"
         ORDER BY "unitsSold" DESC
         LIMIT ${limit}`
}

/** Stock that has not moved since a date, and is still on hand. Capital sitting on a shelf. */
export async function deadStock(prisma: PrismaClient, since: Date, locationId: string = DEFAULT_LOCATION_ID) {
    return prisma.$queryRaw<Array<{ sku: string; onHand: number; lastMovement: Date | null }>>`
        SELECT p."productId" AS sku,
               l."onHand",
               (SELECT max(m."createdAt") FROM stock_movements m
                 WHERE m."productId" = p.id AND m.type <> 'INITIAL') AS "lastMovement"
          FROM stock_levels l
          JOIN products p ON p.id = l."productId"
         WHERE l."locationId" = ${locationId} AND l."onHand" > 0
           AND NOT EXISTS (
               SELECT 1 FROM stock_movements m
                WHERE m."productId" = p.id AND m.type <> 'INITIAL' AND m."createdAt" >= ${utcBoundary(since)}::timestamp
           )
         ORDER BY l."onHand" DESC`
}

/** Margin, or the reason there is none to report. */
export async function grossMargin(prisma: PrismaClient, since: Date): Promise<Valuation> {
    if (await isOpeningCountPending(prisma)) {
        return { available: false, reason: "opening-count-pending" }
    }
    const rows = await prisma.$queryRaw<Array<{ revenue: string | null; cost: string | null }>>`
        SELECT sum(oi.price * oi.quantity)::text AS revenue,
               sum(p."averageCost" * oi.quantity)::text AS cost
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId"
          JOIN products p ON p.id = oi."productId"
         WHERE o.status = 'delivered' AND o."deliveredAt" >= ${utcBoundary(since)}::timestamp`

    const row = rows[0]
    // A null cost is not zero (§13.6): reporting revenue as pure margin is the exact lie the
    // nullable column exists to prevent.
    if (!row?.revenue || row.cost === null) {
        return { available: false, reason: "cost-not-recorded" }
    }
    return { available: true, value: serializeMoney(money(row.revenue).minus(money(row.cost))) }
}

/**
 * COD refusal rate: delivered against returned-after-shipping, over a window.
 *
 * The number that decides whether cash on delivery is worth its losses, and it was not
 * measurable before — the RETURN movement that makes a refusal distinguishable from an
 * ordinary cancellation only exists as of the state machine.
 */
export async function codRefusalRate(prisma: PrismaClient, since: Date) {
    const rows = await prisma.$queryRaw<Array<{ delivered: bigint; refused: bigint }>>`
        SELECT
          count(*) FILTER (WHERE status = 'delivered')::bigint AS delivered,
          count(*) FILTER (
              WHERE status = 'cancelled'
                AND EXISTS (
                    SELECT 1 FROM stock_movements m
                     WHERE m."referenceType" = 'order-return' AND m."referenceId" = orders.id
                )
          )::bigint AS refused
        FROM orders
        WHERE "createdAt" >= ${utcBoundary(since)}::timestamp`

    const delivered = Number(rows[0]?.delivered ?? 0)
    const refused = Number(rows[0]?.refused ?? 0)
    const total = delivered + refused
    return { delivered, refused, rate: total === 0 ? 0 : refused / total }
}
