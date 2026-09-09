/**
 * Effective prices.
 *
 * Migration 0015 added discounts as an OVERLAY: `products.price` is the base price and always
 * stays the base price, and a discount is a window during which a product sells for less.
 * That decision only pays off if there is exactly ONE resolver, and this module is it.
 *
 * The failure mode it exists to prevent is specific and expensive: a storefront that renders
 * a discounted price while the checkout charges the base one. That happens the moment a second
 * place learns how to apply a discount — the product page rounds one way, the cart another, or
 * one of them forgets that a discount ended four minutes ago. So the storefront, the cart, the
 * configure flow, the order and the admin's preview all resolve through the functions below,
 * and nothing else multiplies a price by a percentage.
 *
 * Three rules, decided here rather than per call site:
 *
 *   1. DISCOUNTS DO NOT STACK. Where several apply to one product, the customer gets the best
 *      single one. Stacking a category sale onto a family sale is how "-20%" and "-30%" become
 *      44% off and nobody can explain the number on the invoice.
 *
 *   2. THE WINDOW IS HALF-OPEN — `startsAt <= now < endsAt`. A discount ending on the 15th and
 *      one starting on the 15th are never both live, so the "best single one" above cannot
 *      depend on which instant the page was rendered.
 *
 *   3. AN EFFECTIVE PRICE IS NEVER ZERO OR NEGATIVE. A fixed amount larger than the price is
 *      clamped to MIN_EFFECTIVE_PRICE here, and flagged in the admin's preview before it is
 *      ever created — `products_price_positive` guards the column, and this guards the number
 *      that column's readers actually charge.
 */
import type { DiscountKind, DiscountScopeType, Prisma, PrismaClient } from "@prisma/client"
import {
    compareMoney,
    money,
    roundMoney,
    serializeMoney,
    subtractMoney,
    type Money,
    type MoneyInput,
    type SerializedMoney,
} from "./money"

type Client = PrismaClient | Prisma.TransactionClient

/** The floor an overlay may take a price to. A free product is a decision, not a rounding. */
export const MIN_EFFECTIVE_PRICE: SerializedMoney = "0.01"

/**
 * A live discount, flattened for matching.
 *
 * `subCategoryIds` is why this is not just the row: a CATEGORY-scoped discount is expanded
 * into its sub-categories when it is loaded, so matching a product only ever needs the three
 * ids a product row already carries (its own, its family's, its sub-category's). The
 * alternative — carrying `categoryId` and joining every product back up to its category at
 * match time — is a second query on the render path of every listing.
 */
export interface ActiveDiscount {
    id: string
    name: string
    kind: DiscountKind
    /** Percent (15 = 15% off) or an amount off, per `kind`. A string: money is never a number. */
    value: SerializedMoney
    scopeType: DiscountScopeType
    subCategoryIds: readonly string[]
    familyId: string | null
    productIds: readonly string[]
    startsAt: Date
    endsAt: Date
}

/** The three ids matching needs. Every product row already has all of them. */
export interface DiscountableProduct {
    id: string
    familyId: string | null
    subCategoryId: string
}

/** What a product costs right now, and why. */
export interface EffectivePrice {
    /** `products.price` — untouched by any discount. */
    base: SerializedMoney
    /** What a customer pays. Equal to `base` when nothing applies. */
    effective: SerializedMoney
    /** How much comes off. "0.00" when nothing applies. */
    saving: SerializedMoney
    /** Whole percent off, for the badge. 0 when nothing applies. */
    percentOff: number
    discount: {
        id: string
        name: string
        kind: DiscountKind
        value: SerializedMoney
        /**
         * When this discount stops applying. Carried because the surfaces that ANNOUNCE a sale
         * need it — "until 14 September" is the difference between a banner and a price — and
         * because the only honest source for it is the discount that actually won.
         */
        endsAt: Date
    } | null
}

/**
 * Every live discount, at an instant.
 *
 * Deliberately loads ALL of them rather than filtering per product: the whole live set is a
 * handful of rows, and one query per request beats one per tile on a listing of forty. Callers
 * on a render path should hold the result for the request — `apps/www/lib/discounts.ts` wraps
 * this in React `cache` for exactly that.
 */
export async function loadActiveDiscounts(client: Client, at: Date = new Date()): Promise<ActiveDiscount[]> {
    const rows = await client.discount.findMany({
        where: {
            isActive: true,
            startsAt: { lte: at },
            // Half-open: `endsAt` itself is already outside the window (rule 2).
            endsAt: { gt: at },
        },
        select: {
            id: true,
            name: true,
            kind: true,
            value: true,
            scopeType: true,
            categoryId: true,
            subCategoryId: true,
            familyId: true,
            startsAt: true,
            endsAt: true,
            products: { select: { productId: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    if (rows.length === 0) return []

    // CATEGORY discounts are expanded once, here, into the sub-categories they cover. Deleted
    // sub-categories are excluded: a discount cannot apply to products that are not for sale.
    const categoryIds = rows.map((row) => row.categoryId).filter((id): id is string => id !== null)
    const byCategory = new Map<string, string[]>()
    if (categoryIds.length > 0) {
        const subCategories = await client.subCategory.findMany({
            where: { categoryId: { in: categoryIds }, deletedAt: null },
            select: { id: true, categoryId: true },
        })
        for (const sub of subCategories) {
            const list = byCategory.get(sub.categoryId)
            if (list) list.push(sub.id)
            else byCategory.set(sub.categoryId, [sub.id])
        }
    }

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        value: serializeMoney(row.value),
        scopeType: row.scopeType,
        subCategoryIds:
            row.scopeType === "CATEGORY"
                ? (byCategory.get(row.categoryId!) ?? [])
                : row.subCategoryId
                  ? [row.subCategoryId]
                  : [],
        familyId: row.familyId,
        productIds: row.products.map((link) => link.productId),
        startsAt: row.startsAt,
        endsAt: row.endsAt,
    }))
}

/** Does this discount cover this product? */
export function discountApplies(discount: ActiveDiscount, product: DiscountableProduct): boolean {
    switch (discount.scopeType) {
        case "ALL":
            return true
        case "CATEGORY":
        case "SUB_CATEGORY":
            return discount.subCategoryIds.includes(product.subCategoryId)
        case "FAMILY":
            return product.familyId !== null && product.familyId === discount.familyId
        case "PRODUCTS":
            return discount.productIds.includes(product.id)
        default:
            // An enum member added by a migration and not handled here must not silently
            // discount everything.
            return false
    }
}

/**
 * How narrow a scope is. Only a tie-break: the cheapest price wins first, and this decides
 * between two discounts that land on the same number, so "these four SKUs" beats "everything"
 * and the badge names the discount an operator would expect.
 */
export function scopeSpecificity(scopeType: DiscountScopeType): number {
    switch (scopeType) {
        case "PRODUCTS":
            return 4
        case "FAMILY":
            return 3
        case "SUB_CATEGORY":
            return 2
        case "CATEGORY":
            return 1
        default:
            return 0
    }
}

/**
 * One discount against one price.
 *
 * Rounded once, here, because this is the number a customer is charged and a line total is
 * this × quantity — rounding after the multiplication would price ten units at a different
 * unit price than one (ADR 0001).
 */
export function applyDiscount(price: MoneyInput, discount: Pick<ActiveDiscount, "kind" | "value">): Money {
    const base = money(price)
    const raw =
        discount.kind === "PERCENT"
            ? base.minus(base.times(money(discount.value)).dividedBy(100))
            : base.minus(money(discount.value))

    const rounded = roundMoney(raw)
    // Rule 3. An amount larger than the price clamps rather than inverting the sale.
    return compareMoney(rounded, MIN_EFFECTIVE_PRICE) < 0 ? money(MIN_EFFECTIVE_PRICE) : rounded
}

/**
 * What this product costs right now.
 *
 * `discounts` is the live set from `loadActiveDiscounts`; passing an empty array is the
 * "no discounts" case and costs nothing, which is why every read path can call this
 * unconditionally instead of branching on whether a sale is running.
 */
export function resolveEffectivePrice(
    price: MoneyInput,
    product: DiscountableProduct,
    discounts: readonly ActiveDiscount[]
): EffectivePrice {
    const base = roundMoney(price)
    const none: EffectivePrice = {
        base: serializeMoney(base),
        effective: serializeMoney(base),
        saving: "0.00",
        percentOff: 0,
        discount: null,
    }

    let winner: ActiveDiscount | null = null
    let winningPrice: Money | null = null

    for (const discount of discounts) {
        if (!discountApplies(discount, product)) continue

        const candidate = applyDiscount(base, discount)
        if (compareMoney(candidate, base) >= 0) continue // a discount that saves nothing is not one

        // Rule 1: best single discount. Cheaper wins; equal prices go to the narrower scope.
        if (
            winningPrice === null ||
            compareMoney(candidate, winningPrice) < 0 ||
            (compareMoney(candidate, winningPrice) === 0 &&
                scopeSpecificity(discount.scopeType) > scopeSpecificity(winner!.scopeType))
        ) {
            winner = discount
            winningPrice = candidate
        }
    }

    if (!winner || !winningPrice) return none

    const saving = subtractMoney(base, winningPrice)
    return {
        base: serializeMoney(base),
        effective: serializeMoney(winningPrice),
        saving: serializeMoney(saving),
        // Rounded for display only. The badge says "−15%"; the money says what is charged.
        percentOff: Math.round(saving.dividedBy(base).times(100).toNumber()),
        discount: {
            id: winner.id,
            name: winner.name,
            kind: winner.kind,
            value: winner.value,
            endsAt: winner.endsAt,
        },
    }
}

/**
 * The one-product convenience: load and resolve in a single call.
 *
 * For the paths that touch one product and are not rendering a list — the configure flow, the
 * order it becomes. A listing must NOT use this: it would query the discount table once per
 * tile.
 */
export async function effectivePriceFor(
    client: Client,
    product: DiscountableProduct & { price: MoneyInput },
    at: Date = new Date()
): Promise<EffectivePrice> {
    const discounts = await loadActiveDiscounts(client, at)
    return resolveEffectivePrice(product.price, product, discounts)
}
