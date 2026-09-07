import {
    codRefusalRate,
    countLowStock,
    deadStock,
    DEFAULT_LOCATION_ID,
    grossMargin,
    listLowStock,
    movementHistory,
    prisma,
    recordMovement,
    sellThrough,
    stocktakeVariance,
    stockValuation,
    type MovementType,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"

/**
 * The admin's inventory surface — BUILD §13, §24.3.
 *
 * STOCK IS NEVER AN EDITABLE NUMBER. There is no `setStock`, and there will not be one: the
 * only way to change stock by hand is an ADJUSTMENT movement with a mandatory reason, so
 * every number the ledger holds can be explained by reading it. That is the difference
 * between an inventory system and a field.
 *
 * Everything here goes through `recordMovement`, the single writer, and every call requires an
 * admin — the role check is `requireCurrentAdmin()`, which throws, so a forgotten check fails
 * closed.
 */

export class InventoryService {
    /**
     * A manual correction. `reason` is required by the signature, not by a convention, because
     * an adjustment without one is an unexplained number in an append-only ledger.
     */
    static async adjust(input: {
        productId: string
        /** Signed: +3 found on a shelf, -2 damaged in the box. */
        quantity: number
        reason: string
        locationId?: string
    }) {
        const admin = await requireCurrentAdmin()
        if (!input.reason.trim()) throw new Error("an adjustment needs a reason")

        return prisma.$transaction((tx) =>
            recordMovement(tx, {
                productId: input.productId,
                locationId: input.locationId ?? DEFAULT_LOCATION_ID,
                type: "ADJUSTMENT",
                quantity: input.quantity,
                reason: input.reason.trim(),
                referenceType: "manual",
                referenceId: `${admin.id}:${Date.now()}`,
                actorType: "ADMIN",
                actorId: admin.id,
            })
        )
    }

    /** Damage and loss — a separate type so it is countable, not an adjustment with a note. */
    static async recordDamage(input: { productId: string; quantity: number; reason: string; locationId?: string }) {
        const admin = await requireCurrentAdmin()
        if (!input.reason.trim()) throw new Error("damage needs a reason")

        return prisma.$transaction((tx) =>
            recordMovement(tx, {
                productId: input.productId,
                locationId: input.locationId ?? DEFAULT_LOCATION_ID,
                type: "DAMAGE",
                quantity: -Math.abs(input.quantity),
                reason: input.reason.trim(),
                referenceType: "manual",
                referenceId: `${admin.id}:${Date.now()}`,
                actorType: "ADMIN",
                actorId: admin.id,
            })
        )
    }

    /**
     * Goods in. `unitCost` is what makes weighted-average costing possible at all — and the
     * only way `averageCost` ever stops being null, which is what §13.6's reports are waiting
     * for. Passing null is allowed and honest; passing 0 to get past a form is not, so it is
     * rejected.
     */
    static async receivePurchase(input: {
        productId: string
        quantity: number
        unitCost: string | null
        reason?: string
        locationId?: string
    }) {
        const admin = await requireCurrentAdmin()
        if (input.quantity <= 0) throw new Error("a receipt must be a positive quantity")
        if (input.unitCost !== null && Number(input.unitCost) <= 0) {
            throw new Error("unitCost must be positive, or null when it is genuinely not recorded")
        }

        return prisma.$transaction(async (tx) => {
            const movement = await recordMovement(tx, {
                productId: input.productId,
                locationId: input.locationId ?? DEFAULT_LOCATION_ID,
                type: "PURCHASE_RECEIPT",
                quantity: input.quantity,
                unitCost: input.unitCost,
                reason: input.reason ?? "purchase receipt",
                referenceType: "manual",
                referenceId: `${admin.id}:${Date.now()}`,
                actorType: "ADMIN",
                actorId: admin.id,
            })

            // Weighted average, recomputed from the receipts that carry a cost. Receipts with
            // a null cost are EXCLUDED rather than counted as zero — averaging in a zero is
            // how a cost silently drifts toward nothing.
            if (input.unitCost !== null) {
                const rows = await tx.$queryRaw<Array<{ avg: string | null }>>`
                    SELECT (sum("unitCost" * quantity) / NULLIF(sum(quantity), 0))::text AS avg
                      FROM stock_movements
                     WHERE "productId" = ${input.productId}
                       AND type = 'PURCHASE_RECEIPT'
                       AND "unitCost" IS NOT NULL`
                const average = rows[0]?.avg
                if (average) {
                    await tx.product.update({ where: { id: input.productId }, data: { averageCost: average } })
                }
            }

            return movement
        })
    }

    // --- reads ---------------------------------------------------------------------------

    static async lowStock(threshold = 10) {
        await requireCurrentAdmin()
        return listLowStock(prisma, threshold)
    }

    static async lowStockCount(threshold = 10) {
        await requireCurrentAdmin()
        return countLowStock(prisma, threshold)
    }

    static async history(productId: string, limit = 100) {
        await requireCurrentAdmin()
        return movementHistory(prisma, productId, limit)
    }

    /**
     * The §13 report set. Valuation and margin return a REASON rather than a number while the
     * opening count is pending (N1) — the screen renders that reason, never a zero.
     */
    static async reports(since: Date) {
        await requireCurrentAdmin()
        const [valuation, variance, sold, dead, margin, refusals] = await Promise.all([
            stockValuation(prisma),
            stocktakeVariance(prisma),
            sellThrough(prisma, since),
            deadStock(prisma, since),
            grossMargin(prisma, since),
            codRefusalRate(prisma, since),
        ])
        return { valuation, variance, sold, dead, margin, refusals }
    }

    /**
     * The same report set over a trailing window.
     *
     * The window is computed HERE rather than in the page, because `Date.now()` in a server
     * component body is a value that changes between renders of the same tree — the React
     * compiler rejects it, and it is right to.
     */
    static async reportsForLastDays(days: number) {
        return this.reports(new Date(Date.now() - days * 86_400_000))
    }

    /**
     * Clear the opening-count flag. The first REAL stocktake is what makes valuation
     * meaningful, so this is deliberately its own action rather than a side effect of any
     * adjustment — flipping it should be a decision somebody made.
     */
    static async completeOpeningStocktake() {
        const admin = await requireCurrentAdmin()
        await prisma.$transaction(async (tx) => {
            await tx.systemSetting.updateMany({
                where: { key: "inventory.opening_count_pending" },
                data: { value: "false" },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "inventory.opening_stocktake_completed",
                    entity: "SystemSetting",
                    entityId: "inventory.opening_count_pending",
                    diff: { from: "true", to: "false" },
                },
            })
        })
    }
}
