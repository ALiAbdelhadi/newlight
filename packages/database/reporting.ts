import type { PrismaClient } from "@prisma/client"
import { DEFAULT_LOCATION_ID, OPENING_COUNT_PENDING_KEY } from "./inventory"
import { money, serializeMoney, type SerializedMoney } from "./money"

function utcBoundary(date: Date): string {
    return date.toISOString().replace("T", " ").replace("Z", "")
}

export type Valuation =
    | { available: true; value: SerializedMoney }
    | { available: false; reason: "opening-count-pending" | "cost-not-recorded" }

export async function isOpeningCountPending(prisma: PrismaClient): Promise<boolean> {
    const flag = await prisma.systemSetting.findUnique({ where: { key: OPENING_COUNT_PENDING_KEY } })
    return flag?.value === "true"
}

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

export async function movementHistory(prisma: PrismaClient, productId: string, limit = 100) {
    return prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { location: { select: { name: true } } },
    })
}

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
    if (!row?.revenue || row.cost === null) {
        return { available: false, reason: "cost-not-recorded" }
    }
    return { available: true, value: serializeMoney(money(row.revenue).minus(money(row.cost))) }
}

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
