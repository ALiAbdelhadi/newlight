/**
 * Inventory.
 *
 * Migration 0009 replaced products.inventory — one mutable integer — with an append-only
 * ledger (stock_movements) plus a derived level (stock_levels). That only holds if there is
 * exactly ONE writer, and this module is it. A `prisma.stockLevel.update()` anywhere else
 * produces a level that no sequence of movements explains, and the ledger's whole value is
 * that it explains the level.
 *
 * Three invariants, each enforced here rather than assumed:
 *
 *   1. A movement and the level change it causes are ONE transaction. Every function takes
 *      a Prisma.TransactionClient, so it is impossible to call outside one.
 *
 *   2. The sign of `quantity` must match the movement type. A SALE of +5 is not a typo the
 *      caller gets to make; it silently creates stock.
 *
 *   3. Movements carrying a reference are IDEMPOTENT (foundation F5). A retried delivery
 *      webhook, a double-clicked admin button and a replayed job all apply once. This is a
 *      property of the ledger, not a guard in the UI — the UI is not where retries happen.
 *
 * unitCost is nullable and NEVER zero. NULL means "cost not recorded"; 0 means "free". The
 * migrated opening balances have no cost, so they carry NULL and stock valuation refuses to
 * report a number while SystemSetting `inventory.opening_count_pending` is set (A9/N1).
 */
import { Prisma, type ActorType, type MovementType, type PrismaClient } from "@prisma/client"

/** Seeded by migration 0009. One physical location exists today. */
export const DEFAULT_LOCATION_ID = "location_main"

/** The reason recorded against every migrated opening balance. It is not a stocktake. */
export const MIGRATED_OPENING_REASON = "migrated placeholder — not a physical count"

/** The flag that suppresses stock valuation until a real count happens. */
export const OPENING_COUNT_PENDING_KEY = "inventory.opening_count_pending"

export type InventoryTx = Prisma.TransactionClient

/** Which way each movement type is allowed to move stock. */
const DIRECTION: Record<MovementType, "in" | "out" | "either"> = {
    INITIAL: "in",
    PURCHASE_RECEIPT: "in",
    RETURN: "in",
    TRANSFER_IN: "in",
    SALE: "out",
    TRANSFER_OUT: "out",
    DAMAGE: "out",
    ADJUSTMENT: "either", // a correction can go either way; that is what makes it a correction
}

export interface MovementInput {
    productId: string
    /** Defaults to the single seeded location. */
    locationId?: string
    type: MovementType
    /**
     * The SIGNED delta applied to onHand: +10 received, -2 sold. The sign must agree with
     * the movement type; INITIAL may be 0 (a counted-empty shelf is a real observation).
     */
    quantity: number
    /** NULL means "not recorded". Never pass 0 to mean "unknown". */
    unitCost?: Prisma.Decimal | string | null
    reason?: string | null
    /** Together these make the movement idempotent, e.g. ("order", orderId). */
    referenceType?: string | null
    referenceId?: string | null
    actorType?: ActorType | null
    actorId?: string | null
}

export interface MovementResult {
    movementId: string
    onHand: number
    /** True when an identical referenced movement already existed and nothing was written. */
    deduplicated: boolean
}

/**
 * Record a stock movement and apply it to the level, in the caller's transaction.
 *
 *     await prisma.$transaction((tx) => recordMovement(tx, { ... }))
 */
export async function recordMovement(tx: InventoryTx, input: MovementInput): Promise<MovementResult> {
    const locationId = input.locationId ?? DEFAULT_LOCATION_ID
    assertDirection(input.type, input.quantity)

    if (input.unitCost !== undefined && input.unitCost !== null) {
        const cost = new Prisma.Decimal(input.unitCost)
        if (cost.isNegative()) {
            throw new RangeError(`recordMovement(): unitCost may not be negative (${cost.toString()})`)
        }
    }

    // Idempotency (F5). Scoped to (type, referenceType, referenceId) so that an order which
    // legitimately produces a SALE and later a RETURN is not collapsed into one movement.
    if (input.referenceType && input.referenceId) {
        const existing = await tx.stockMovement.findFirst({
            where: {
                type: input.type,
                referenceType: input.referenceType,
                referenceId: input.referenceId,
                productId: input.productId,
                locationId,
            },
            select: { id: true },
        })
        if (existing) {
            const level = await tx.stockLevel.findUnique({
                where: { productId_locationId: { productId: input.productId, locationId } },
                select: { onHand: true },
            })
            return { movementId: existing.id, onHand: level?.onHand ?? 0, deduplicated: true }
        }
    }

    const movement = await tx.stockMovement.create({
        data: {
            productId: input.productId,
            locationId,
            type: input.type,
            quantity: input.quantity,
            unitCost: input.unitCost ?? null,
            reason: input.reason ?? null,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            actorType: input.actorType ?? null,
            actorId: input.actorId ?? null,
        },
        select: { id: true },
    })

    // Two steps, not an upsert.
    //
    // `upsert` puts the movement quantity in the CREATE branch, and PostgreSQL evaluates CHECK
    // constraints on the proposed insert tuple BEFORE it resolves the conflict — so an
    // outbound movement (-3) failed `stock_levels_on_hand_non_negative` even when the row
    // already existed and the real result would have been 4997.
    //
    // Worse, without that constraint the create branch would have SUCCEEDED on a product with
    // no level row yet and written onHand = -3: negative stock, silently, from a sale of goods
    // that were never received. The constraint caught it; this is the fix.
    //
    // Ensuring the row at 0 first is always valid, and the increment is then checked against
    // the real balance — so selling stock you do not have still fails, which is correct.
    await tx.stockLevel.upsert({
        where: { productId_locationId: { productId: input.productId, locationId } },
        create: { productId: input.productId, locationId, onHand: 0, reserved: 0 },
        update: {},
        select: { productId: true },
    })

    const level = await tx.stockLevel.update({
        where: { productId_locationId: { productId: input.productId, locationId } },
        data: { onHand: { increment: input.quantity } },
        select: { onHand: true },
    })

    return { movementId: movement.id, onHand: level.onHand, deduplicated: false }
}

/**
 * Hold stock for an order that has not shipped. Reservations are NOT movements: nothing has
 * physically moved, so writing one would put a fiction in the ledger. They are a claim on
 * onHand, released on cancellation and converted to a SALE on shipment.
 */
export async function reserve(
    tx: InventoryTx,
    productId: string,
    quantity: number,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<void> {
    assertPositive(quantity, "reserve")
    const level = await tx.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
        select: { onHand: true, reserved: true },
    })
    const available = (level?.onHand ?? 0) - (level?.reserved ?? 0)
    if (available < quantity) {
        throw new InsufficientStockError(productId, locationId, quantity, available)
    }
    await tx.stockLevel.update({
        where: { productId_locationId: { productId, locationId } },
        data: { reserved: { increment: quantity } },
    })
}

export async function release(
    tx: InventoryTx,
    productId: string,
    quantity: number,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<void> {
    assertPositive(quantity, "release")
    const level = await tx.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
        select: { reserved: true },
    })
    // Clamped, not asserted: releasing more than is held means an earlier release already
    // ran (a retry), and throwing would turn a harmless repeat into a failed cancellation.
    const decrement = Math.min(quantity, level?.reserved ?? 0)
    if (decrement === 0) return
    await tx.stockLevel.update({
        where: { productId_locationId: { productId, locationId } },
        data: { reserved: { decrement } },
    })
}

/** Stock a customer could actually buy right now. */
export async function availableQuantity(
    tx: InventoryTx,
    productId: string,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<number> {
    const level = await tx.stockLevel.findUnique({
        where: { productId_locationId: { productId, locationId } },
        select: { onHand: true, reserved: true },
    })
    return Math.max(0, (level?.onHand ?? 0) - (level?.reserved ?? 0))
}

/**
 * Replay the ledger and compare it with the stored level. The ledger is the truth; a
 * disagreement means something wrote stock_levels directly, which is the one thing this
 * module exists to prevent. Run it in the P5 stocktake and after any bulk import.
 */
export async function reconcile(
    tx: InventoryTx,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<Array<{ productId: string; ledger: number; stored: number }>> {
    const ledger = await tx.stockMovement.groupBy({
        by: ["productId"],
        where: { locationId },
        _sum: { quantity: true },
    })
    const stored = await tx.stockLevel.findMany({
        where: { locationId },
        select: { productId: true, onHand: true },
    })
    const storedBy = new Map(stored.map((row) => [row.productId, row.onHand]))
    const drift: Array<{ productId: string; ledger: number; stored: number }> = []

    for (const row of ledger) {
        const sum = row._sum.quantity ?? 0
        const onHand = storedBy.get(row.productId) ?? 0
        if (sum !== onHand) drift.push({ productId: row.productId, ledger: sum, stored: onHand })
        storedBy.delete(row.productId)
    }
    // Levels with no movements at all: a level that nothing explains.
    for (const [productId, onHand] of storedBy) {
        if (onHand !== 0) drift.push({ productId, ledger: 0, stored: onHand })
    }
    return drift
}

export class InsufficientStockError extends Error {
    constructor(
        readonly productId: string,
        readonly locationId: string,
        readonly requested: number,
        readonly available: number
    ) {
        super(`insufficient stock for ${productId} at ${locationId}: requested ${requested}, available ${available}`)
        this.name = "InsufficientStockError"
    }
}

function assertDirection(type: MovementType, quantity: number): void {
    if (!Number.isInteger(quantity)) {
        throw new RangeError(`recordMovement(): quantity must be an integer, got ${quantity}`)
    }
    const direction = DIRECTION[type]
    if (direction === "in" && quantity < 0) {
        throw new RangeError(`recordMovement(): ${type} adds stock; quantity may not be negative (${quantity})`)
    }
    if (direction === "out" && quantity >= 0) {
        throw new RangeError(`recordMovement(): ${type} removes stock; quantity must be negative (${quantity})`)
    }
    if (direction === "either" && quantity === 0) {
        throw new RangeError(`recordMovement(): ADJUSTMENT of 0 records nothing`)
    }
}

function assertPositive(quantity: number, fn: string): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new RangeError(`${fn}(): quantity must be a positive integer, got ${quantity}`)
    }
}

/**
 * The available quantity below which a product counts as low stock.
 *
 * Exported because the admin's StatusBadge derives a "Low" state from the same number, and a
 * threshold written down twice is two thresholds the first time one of them is tuned.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10

/**
 * How many active products are at or below a stock threshold.
 *
 * Reads the DERIVED level, not a column on the product: `Product.inventory` is gone, and the
 * number that matters to a buyer is `onHand - reserved`, not `onHand`. A product with 12 on
 * hand and 11 reserved is low stock, and the old query said it was fine.
 *
 * Products with no stock_levels row count as zero, which is what they are.
 */
export async function countLowStock(
    prisma: PrismaClient,
    threshold = DEFAULT_LOW_STOCK_THRESHOLD,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n
          FROM products p
          LEFT JOIN stock_levels l
            ON l."productId" = p.id AND l."locationId" = ${locationId}
         WHERE p."isActive" AND p."deletedAt" IS NULL
           AND COALESCE(l."onHand", 0) - COALESCE(l."reserved", 0) < ${threshold}`
    return Number(rows[0]?.n ?? 0)
}

/** Products at or below the threshold, for the admin's low-stock list. */
export async function listLowStock(
    prisma: PrismaClient,
    threshold = DEFAULT_LOW_STOCK_THRESHOLD,
    locationId: string = DEFAULT_LOCATION_ID
): Promise<Array<{ productId: string; sku: string; onHand: number; reserved: number; available: number }>> {
    const rows = await prisma.$queryRaw<
        Array<{ productId: string; sku: string; onHand: number; reserved: number; available: number }>
    >`
        SELECT p.id AS "productId", p."productId" AS sku,
               COALESCE(l."onHand", 0) AS "onHand",
               COALESCE(l."reserved", 0) AS reserved,
               COALESCE(l."onHand", 0) - COALESCE(l."reserved", 0) AS available
          FROM products p
          LEFT JOIN stock_levels l
            ON l."productId" = p.id AND l."locationId" = ${locationId}
         WHERE p."isActive" AND p."deletedAt" IS NULL
           AND COALESCE(l."onHand", 0) - COALESCE(l."reserved", 0) < ${threshold}
         ORDER BY available ASC, sku ASC`
    return rows
}

/** SystemSetting key for the reservation sweep window, in hours. */
export const RESERVATION_TTL_SETTING = "inventory.reservation_ttl_hours"
export const DEFAULT_RESERVATION_TTL_HOURS = 72

export interface SweepSummary {
    windowHours: number
    ordersConsidered: number
    ordersReleased: number
    itemsReleased: number
    /** Order numbers whose stock was freed, for the notification and the report. */
    released: Array<{ orderId: string; orderNumber: string; ageHours: number }>
}

/**
 * Release reservations on orders that have sat unshipped past the window — §8.3.
 *
 * It DOES NOT CANCEL THE ORDER. That is the whole design: an order sitting for four days is
 * usually a customer the owner has not called yet, not an abandoned one, and auto-cancelling
 * it would destroy a sale to tidy up a number. What it does is stop that order holding stock
 * hostage from customers who are ready to buy, and raise a notification so a person decides.
 *
 * Idempotent (F5) in two independent ways: `release()` clamps, so freeing an already-freed
 * reservation is a no-op; and an order that has already been swept is skipped by its audit
 * row, so the notification does not repeat every two minutes.
 */
export async function sweepExpiredReservations(
    prisma: PrismaClient,
    now: Date = new Date()
): Promise<SweepSummary> {
    const setting = await prisma.systemSetting.findUnique({ where: { key: RESERVATION_TTL_SETTING } })
    const parsed = Number(setting?.value)
    const windowHours = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RESERVATION_TTL_HOURS
    const cutoff = new Date(now.getTime() - windowHours * 3_600_000)

    const candidates = await prisma.order.findMany({
        where: { status: "awaiting_shipment", createdAt: { lt: cutoff } },
        select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            items: { select: { productId: true, quantity: true } },
        },
        orderBy: { createdAt: "asc" },
    })

    const summary: SweepSummary = {
        windowHours,
        ordersConsidered: candidates.length,
        ordersReleased: 0,
        itemsReleased: 0,
        released: [],
    }

    for (const order of candidates) {
        const swept = await prisma.adminAuditLog.findFirst({
            where: { entity: "Order", entityId: order.id, action: "inventory.reservation_expired" },
            select: { id: true },
        })
        if (swept) continue

        await prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                await release(tx, item.productId, item.quantity)
                summary.itemsReleased += item.quantity
            }

            await tx.adminAuditLog.create({
                data: {
                    actorType: "SYSTEM",
                    action: "inventory.reservation_expired",
                    entity: "Order",
                    entityId: order.id,
                    diff: {
                        orderNumber: order.orderNumber,
                        windowHours,
                        items: order.items.length,
                        note: "reservation released; the order was NOT cancelled",
                    },
                },
            })

            // Every administrator, so this reaches whoever is actually working.
            const admins = await tx.user.findMany({
                where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
                select: { id: true },
            })
            if (admins.length > 0) {
                await tx.notification.createMany({
                    data: admins.map((admin) => ({
                        userId: admin.id,
                        type: "LOW_INVENTORY" as const,
                        priority: "HIGH" as const,
                        title: `Reservation expired: ${order.orderNumber}`,
                        message:
                            `Order ${order.orderNumber} has been awaiting shipment for over ${windowHours} hours. ` +
                            `Its stock reservation has been released so other customers can buy. ` +
                            `The order is still open — cancel or ship it.`,
                        actionUrl: `/admin/orders/${order.id}`,
                        metadata: { orderId: order.id, windowHours },
                    })),
                })
            }
        })

        summary.ordersReleased++
        summary.released.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            ageHours: Math.floor((now.getTime() - order.createdAt.getTime()) / 3_600_000),
        })
    }

    return summary
}

/* ------------------------------------------------------------------ stock list */

/**
 * How a row is being narrowed. `all` is the default and is the point of the whole function:
 * `listLowStock` could only ever answer "what is running out", and an operator doing a
 * stocktake needs to see the products that are fine as well as the ones that are not.
 */
export type StockLevelFilter = "all" | "in_stock" | "low" | "reserved" | "out" | "negative"

/** Sortable columns. A string outside this union never reaches the SQL — see `SORT_SQL`. */
export type StockLevelSort = "sku" | "name" | "onHand" | "reserved" | "available"

export interface StockLevelRow {
    productId: string
    sku: string
    name: string | null
    onHand: number
    reserved: number
    available: number
    isActive: boolean
    /** Whether `averageCost` is recorded. Null cost is why valuation refuses a number (N1). */
    hasCost: boolean
}

export interface StockLevelPage {
    rows: StockLevelRow[]
    /** Rows matching the filter across the WHOLE catalogue, not the length of `rows`. */
    total: number
}

/**
 * ORDER BY, as a closed map rather than an interpolated string.
 *
 * `$queryRaw` parameterises VALUES, never identifiers, so a sort column arriving from the
 * query string has to be looked up in a table of fragments written here. There is no branch
 * that concatenates the caller's string into SQL, which is the only way to be sure a
 * hand-edited `?sort=` cannot become one.
 */
const SORT_SQL: Record<StockLevelSort, string> = {
    sku: `p."productId"`,
    name: `t.name`,
    onHand: `COALESCE(l."onHand", 0)`,
    reserved: `COALESCE(l."reserved", 0)`,
    available: `COALESCE(l."onHand", 0) - COALESCE(l."reserved", 0)`,
}

/**
 * Every product with its derived stock level — the readout `listLowStock` is one filter of.
 *
 * Filtering, sorting, counting and paging all happen in PostgreSQL over the same predicate,
 * so the total under the table and the rows in it always describe the same population. The
 * alternative — fetch a page, filter it in JavaScript, print its length as a catalogue total
 * — is the defect §25 exists to forbid.
 *
 * Products with no `stock_levels` row are INCLUDED, at zero, via a LEFT JOIN. They are the
 * products nobody has ever received stock for, which is exactly what an operator opening a
 * stock list is looking for.
 *
 * Inactive products are included unless filtered out, and carry `isActive` so the screen can
 * mark them. A hidden product still occupies shelf space.
 */
export async function listStockLevels(
    prisma: PrismaClient,
    options: {
        search?: string
        filter?: StockLevelFilter
        /** `active` / `hidden` — storefront visibility, not a stock state. */
        status?: string
        /** `missing` / `recorded` — whether a unit cost exists to value the stock with. */
        cost?: string
        sort?: StockLevelSort
        dir?: "asc" | "desc"
        skip?: number
        take?: number
        threshold?: number
        locale?: string
        locationId?: string
    } = {}
): Promise<StockLevelPage> {
    const threshold = options.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD
    const locationId = options.locationId ?? DEFAULT_LOCATION_ID
    const locale = options.locale ?? "en"
    const take = Math.min(Math.max(options.take ?? 50, 1), 500)
    const skip = Math.max(options.skip ?? 0, 0)

    const available = Prisma.sql`COALESCE(l."onHand", 0) - COALESCE(l."reserved", 0)`
    const onHand = Prisma.sql`COALESCE(l."onHand", 0)`

    const where: Prisma.Sql[] = [Prisma.sql`p."deletedAt" IS NULL`]

    const search = options.search?.trim()
    if (search) {
        // SKU or name, in EITHER language — an Arabic-named product has to be findable from
        // the screen that counts it. The name JOIN is locale-scoped for display only.
        const pattern = `%${search}%`
        where.push(Prisma.sql`(
            p."productId" ILIKE ${pattern}
         OR p.slug ILIKE ${pattern}
         OR EXISTS (SELECT 1 FROM product_translations tr
                     WHERE tr."productId" = p.id AND tr.name ILIKE ${pattern})
        )`)
    }

    // The five states are the ones `deriveStockState` renders, expressed in SQL so the badge
    // and the filter can never disagree about what "low" means. `negative` is not a state a
    // badge shows — it is a ledger fault worth being able to list.
    switch (options.filter) {
        case "out":
            where.push(Prisma.sql`${onHand} <= 0`)
            break
        case "reserved":
            where.push(Prisma.sql`${onHand} > 0 AND ${available} <= 0`)
            break
        case "low":
            where.push(Prisma.sql`${available} > 0 AND ${available} < ${threshold}`)
            break
        case "in_stock":
            where.push(Prisma.sql`${available} >= ${threshold}`)
            break
        case "negative":
            where.push(Prisma.sql`(${onHand} < 0 OR COALESCE(l."reserved", 0) < 0)`)
            break
        default:
            break
    }

    if (options.status === "active") where.push(Prisma.sql`p."isActive"`)
    if (options.status === "hidden") where.push(Prisma.sql`NOT p."isActive"`)
    if (options.cost === "missing") where.push(Prisma.sql`p."averageCost" IS NULL`)
    if (options.cost === "recorded") where.push(Prisma.sql`p."averageCost" IS NOT NULL`)

    const predicate = Prisma.join(where, " AND ")
    const level = Prisma.sql`
        LEFT JOIN stock_levels l ON l."productId" = p.id AND l."locationId" = ${locationId}
        LEFT JOIN product_translations t ON t."productId" = p.id AND t.locale = ${locale}`

    const column = SORT_SQL[options.sort ?? "available"] ?? SORT_SQL.available
    // NULLS LAST so untranslated products sort to the end of a name sort rather than to the
    // top of it, in both directions.
    const order = Prisma.raw(`${column} ${options.dir === "asc" ? "ASC" : "DESC"} NULLS LAST`)

    /*
     * The count runs FIRST, and the offset is clamped against it. A hand-edited `?page=40`
     * on a nine-page list would otherwise return zero rows next to a total of four hundred,
     * and the screen would read "no products match" about a filter that matches all of them.
     */
    const counted = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM products p ${level} WHERE ${predicate}`
    const total = Number(counted[0]?.n ?? 0)
    const offset = Math.min(skip, Math.max(0, (Math.max(1, Math.ceil(total / take)) - 1) * take))

    const rows = await prisma.$queryRaw<
            Array<{
                productId: string
                sku: string
                name: string | null
                onHand: number
                reserved: number
                available: number
                isActive: boolean
                hasCost: boolean
            }>
        >`
            SELECT p.id AS "productId",
                   p."productId" AS sku,
                   t.name AS name,
                   ${onHand} AS "onHand",
                   COALESCE(l."reserved", 0) AS reserved,
                   ${available} AS available,
                   p."isActive" AS "isActive",
                   (p."averageCost" IS NOT NULL) AS "hasCost"
              FROM products p ${level}
             WHERE ${predicate}
             ORDER BY ${order}, p."productId" ASC
             LIMIT ${take} OFFSET ${offset}`

    return { rows, total }
}
