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

export type PricingScope =
    | { kind: "category"; categoryId: string }
    | { kind: "subCategory"; subCategoryId: string }
    | { kind: "family"; familyId: string }
    | { kind: "products"; productIds: readonly string[] }

export type PricingFormula =
    | { kind: "percent"; percent: string }
    | { kind: "fixed"; amount: string }
    | { kind: "set"; amount: string }
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
    invalid: PreviewRow[]
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

function multiplyMoneyByDecimal(price: Money, multiplier: string): Money {
    return price.times(money(multiplier))
}

function mintToken(scope: PricingScope, formula: PricingFormula, rows: PreviewRow[]): string {
    return createHash("sha256")
        .update(
            JSON.stringify({
                scope,
                formula,
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
                        changes: preview.rows.map((row) => ({ sku: row.sku, from: row.oldPrice, to: row.newPrice })),
                    },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })

        return { count: preview.count, oldTotal: preview.oldTotal, newTotal: preview.newTotal }
    }

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
