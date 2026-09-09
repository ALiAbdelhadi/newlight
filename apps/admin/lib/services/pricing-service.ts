import { createHash } from "node:crypto"
import {
    addMoney,
    compareMoney,
    money,
    prisma,
    roundMoney,
    serializeMoney,
    subtractMoney,
    sumMoney,
    type Money,
    type SerializedMoney,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Bulk repricing — BUILD §13.2 item 1.
 *
 * This tool is the point of the whole phase. The owner repriced all 189 products by running
 * SQL directly, in three deterministic tiers, because the admin panel offered no way to do it:
 *
 *     tier A   db = static × 1.1000          76 SKUs
 *     tier B   db ≈ static × 1.3967          36 SKUs
 *     tier C   db = static × 1.5736 + 55.3   77 SKUs
 *
 * Tier C is why `linear` exists: a real repricing needs a multiplier AND a fixed component
 * together, and a tool offering only "+10%" would have sent them back to psql.
 *
 * THE PREVIEW IS NOT ADVISORY. `apply()` will not run without a token minted by `preview()`,
 * and the token is a hash of the exact rows and their exact current prices. So:
 *
 *   - you cannot commit a repricing you have not seen; and
 *   - if anything in that set changed between looking and clicking, the token stops matching
 *     and the apply is refused rather than silently pricing against stale numbers.
 *
 * Every apply is one transaction and one audit row carrying actor, scope, formula and count.
 */

export type PricingScope =
    | { kind: "category"; categoryId: string }
    | { kind: "subCategory"; subCategoryId: string }
    | { kind: "family"; familyId: string }
    | { kind: "products"; productIds: readonly string[] }

export type PricingFormula =
    /** `+10` raises by 10%, `-5` cuts by 5%. */
    | { kind: "percent"; percent: string }
    /** `+55` adds 55 EGP, `-20` takes it off. */
    | { kind: "fixed"; amount: string }
    | { kind: "set"; amount: string }
    /** price × multiplier + addend — the shape tier C actually needed. */
    | { kind: "linear"; multiplier: string; addend: string }

export interface PreviewRow {
    productId: string
    sku: string
    name: string
    oldPrice: SerializedMoney
    newPrice: SerializedMoney
    delta: SerializedMoney
}

export interface PricingPreview {
    rows: PreviewRow[]
    count: number
    oldTotal: SerializedMoney
    newTotal: SerializedMoney
    /** Rows the formula would push to zero or below. A preview with any of these cannot apply. */
    invalid: PreviewRow[]
    /** Mint of (scope, formula, rows, current prices). `apply()` requires it back. */
    token: string
}

export class PricingError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "PricingError"
    }
}

function whereFor(scope: PricingScope) {
    const live = { deletedAt: null } as const
    switch (scope.kind) {
        case "category":
            return { ...live, subCategory: { categoryId: scope.categoryId } }
        case "subCategory":
            return { ...live, subCategoryId: scope.subCategoryId }
        case "family":
            return { ...live, familyId: scope.familyId }
        case "products":
            return { ...live, id: { in: [...scope.productIds] } }
    }
}

/** Rounded here, once, because this is the number that gets stored (ADR 0001). */
function applyFormula(price: Money, formula: PricingFormula): Money {
    switch (formula.kind) {
        case "percent": {
            const factor = addMoney("1", money(formula.percent).dividedBy(100))
            return roundMoney(price.times(factor))
        }
        case "fixed":
            return roundMoney(addMoney(price, formula.amount))
        case "set":
            return roundMoney(money(formula.amount))
        case "linear":
            return roundMoney(addMoney(multiplyMoneyByDecimal(price, formula.multiplier), formula.addend))
    }
}

/** multiplyMoney takes an integer quantity by design; a price multiplier is not one. */
function multiplyMoneyByDecimal(price: Money, multiplier: string): Money {
    return price.times(money(multiplier))
}

function mintToken(scope: PricingScope, formula: PricingFormula, rows: PreviewRow[]): string {
    return createHash("sha256")
        .update(
            JSON.stringify({
                scope,
                formula,
                // Ids AND current prices: a change to either invalidates the preview.
                rows: rows.map((row) => [row.productId, row.oldPrice]),
            })
        )
        .digest("hex")
}

export class PricingService {
    static async preview(scope: PricingScope, formula: PricingFormula): Promise<PricingPreview> {
        await requireCurrentAdmin()

        const products = await prisma.product.findMany({
            where: whereFor(scope),
            select: {
                id: true,
                productId: true,
                price: true,
                translations: { where: { locale: "en" }, take: 1, select: { name: true } },
            },
            orderBy: { productId: "asc" },
        })

        if (products.length === 0) throw new PricingError("that selection contains no products")

        const rows: PreviewRow[] = products.map((product) => {
            const oldPrice = money(product.price)
            const newPrice = applyFormula(oldPrice, formula)
            return {
                productId: product.id,
                sku: product.productId,
                name: product.translations[0]?.name ?? product.productId,
                oldPrice: serializeMoney(oldPrice),
                newPrice: serializeMoney(newPrice),
                delta: serializeMoney(subtractMoney(newPrice, oldPrice)),
            }
        })

        // `products_price_positive` would reject these at the database anyway; catching them
        // in the preview means the admin sees WHICH rows are the problem, not a failed commit.
        const invalid = rows.filter((row) => compareMoney(row.newPrice, "0") <= 0)

        return {
            rows,
            count: rows.length,
            oldTotal: serializeMoney(sumMoney(rows.map((r) => r.oldPrice))),
            newTotal: serializeMoney(sumMoney(rows.map((r) => r.newPrice))),
            invalid,
            token: mintToken(scope, formula, rows),
        }
    }

    /**
     * Commit a previewed repricing.
     *
     * Re-previews internally and compares tokens: that is what makes "you must look before you
     * commit" enforceable rather than a UI convention, and what makes a concurrent edit a
     * refusal rather than a silent overwrite.
     */
    static async apply(scope: PricingScope, formula: PricingFormula, token: string) {
        const admin = await requireCurrentAdmin()
        const preview = await this.preview(scope, formula)

        if (preview.token !== token) {
            throw new PricingError(
                "the catalog changed since this preview was generated. Review the new prices and apply again."
            )
        }
        if (preview.invalid.length > 0) {
            throw new PricingError(
                `${preview.invalid.length} product(s) would be priced at or below zero: ${preview.invalid
                    .slice(0, 5)
                    .map((row) => row.sku)
                    .join(", ")}`
            )
        }

        await prisma.$transaction(async (tx) => {
            for (const row of preview.rows) {
                await tx.product.update({ where: { id: row.productId }, data: { price: row.newPrice } })
            }

            // §13.2: actor, scope, formula, row count. This row is also what §3's price
            // history is derived from — there is no separate table.
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.bulk_reprice",
                    entity: "Product",
                    entityId: `${scope.kind}:${"categoryId" in scope ? scope.categoryId : "subCategoryId" in scope ? scope.subCategoryId : "familyId" in scope ? scope.familyId : `${scope.productIds.length} selected`}`,
                    diff: {
                        scope,
                        formula,
                        count: preview.count,
                        oldTotal: preview.oldTotal,
                        newTotal: preview.newTotal,
                        // Every row, so a repricing can be read back and reversed by hand.
                        changes: preview.rows.map((row) => ({ sku: row.sku, from: row.oldPrice, to: row.newPrice })),
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })

        return { count: preview.count, oldTotal: preview.oldTotal, newTotal: preview.newTotal }
    }

    /**
     * §3: price history is DERIVED from the audit log rather than kept in its own table.
     * Nothing has to remember to write it, because nothing can reprice without writing one.
     */
    /**
     * One product, one new price.
     *
     * It goes through `preview` and `apply` rather than writing `product.price` directly, so a
     * single edit lands in the audit log in exactly the shape `priceHistory` reads back. A
     * second write path to the same column is how a price change becomes untraceable — and
     * "who changed this and when" is the question the bulk editor exists to answer.
     *
     * The token round-trip is internal here: a one-row change is its own preview, and there is
     * nothing for a human to review that the confirmation dialog does not already show.
     */
    static async setPrice(productId: string, amount: string) {
        const scope: PricingScope = { kind: "products", productIds: [productId] }
        const formula: PricingFormula = { kind: "set", amount }
        const preview = await this.preview(scope, formula)

        if (preview.count === 0) throw new PricingError("that product no longer exists.")
        if (preview.invalid.length > 0) throw new PricingError("a price must be greater than zero.")

        const row = preview.rows[0]!
        if (row.oldPrice === row.newPrice) return { changed: false, price: row.newPrice }

        await this.apply(scope, formula, preview.token)
        return { changed: true, price: row.newPrice, previous: row.oldPrice }
    }

    static async priceHistory(productId: string, limit = 50) {
        await requireCurrentAdmin()
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: { productId: true },
        })

        const rows = await prisma.$queryRaw<
            Array<{ createdAt: Date; actorEmail: string | null; from: string; to: string; action: string }>
        >`
            SELECT a."createdAt", a."actorEmail", a.action,
                   change ->> 'from' AS "from",
                   change ->> 'to'   AS "to"
              FROM admin_audit_log a,
                   LATERAL jsonb_array_elements(a.diff -> 'changes') AS change
             WHERE a.entity = 'Product'
               AND change ->> 'sku' = ${product.productId}
             ORDER BY a."createdAt" DESC
             LIMIT ${limit}`
        return rows
    }
}
