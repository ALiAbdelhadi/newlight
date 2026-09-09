import { Prisma, prisma, resolveEffectivePrice, type ActiveDiscount, type Locale } from "@repo/database"

import { activeDiscounts } from "@/lib/discounts"
import { liveProduct, productLinkedCardInclude, toCardView, type CardView } from "./selectors"

/**
 * What is on offer right now — the read side of the discount system (§13.2, migration 0015).
 *
 * The admin can create a discount; this is what makes a customer find out. Three surfaces ask
 * three different questions, and each gets exactly the query it needs:
 *
 *   the site-wide strip   "is anything on offer at all, and how big is the best of it?"
 *   a section banner      "is anything in THIS sub-category on offer?"
 *   the /offers page      "everything on offer, grouped by section"
 *
 * NOTHING HERE DECIDES A PRICE. Every number comes back through `resolveEffectivePrice`, the
 * same resolver the tile, the cart and the order use — so a banner claiming "up to 15% off"
 * cannot outlive, or overstate, the discount it is describing.
 *
 * `percentOff` is computed per product and MAXED, never read off the discount row. A 200 EGP
 * discount is 20% of one product and 40% of another, and "up to" is the only honest word for
 * the pair of them.
 */

export interface OfferSummary {
    /** The best percentage any product in the set is actually discounted by. */
    percentOff: number
    /**
     * How many PRODUCTS a customer would see on offer — one per family, not one per SKU.
     *
     * The listing shows one card per family (§6: five wattages of one fixture are one product
     * to a reader), so counting SKUs made the banner say "77 products" over a grid of 25. A
     * count that disagrees with the page under it is worse than no count.
     */
    productCount: number
    /** The soonest end among the discounts that won, ISO — "ends 14 September". */
    endsAt: string
}

export interface OfferGroup {
    subCategoryId: string
    name: string
    slug: string
    categoryName: string
    categorySlug: string
    summary: OfferSummary
    products: Array<CardView<Prisma.ProductGetPayload<{ include: ReturnType<typeof productLinkedCardInclude> }>>>
}

/** The three ids the resolver matches on, and the price. Nothing else is needed to summarise. */
type PricedRow = { id: string; familyId: string | null; subCategoryId: string; price: Prisma.Decimal }

/**
 * The narrowest `where` that can still contain every discounted product.
 *
 * A catalogue-wide discount widens it to the whole catalogue, which is correct rather than
 * lazy; anything narrower is expressed as the union of the scopes actually in play, so a
 * two-SKU sale reads two rows instead of 189.
 */
function whereForDiscounts(discounts: readonly ActiveDiscount[]): Prisma.ProductWhereInput | null {
    if (discounts.length === 0) return null
    if (discounts.some((discount) => discount.scopeType === "ALL")) return { ...liveProduct }

    const subCategoryIds = new Set<string>()
    const familyIds = new Set<string>()
    const productIds = new Set<string>()

    for (const discount of discounts) {
        discount.subCategoryIds.forEach((id) => subCategoryIds.add(id))
        if (discount.familyId) familyIds.add(discount.familyId)
        discount.productIds.forEach((id) => productIds.add(id))
    }

    const or: Prisma.ProductWhereInput[] = []
    if (subCategoryIds.size > 0) or.push({ subCategoryId: { in: [...subCategoryIds] } })
    if (familyIds.size > 0) or.push({ familyId: { in: [...familyIds] } })
    if (productIds.size > 0) or.push({ id: { in: [...productIds] } })
    if (or.length === 0) return null

    return { ...liveProduct, OR: or }
}

/**
 * Summarise a set of products against the live discounts.
 *
 * Returns null when nothing in the set is discounted — which is the case that matters most,
 * because it is what makes the banner disappear on its own rather than needing to be taken
 * down.
 */
export function summariseOffers(rows: readonly PricedRow[], discounts: readonly ActiveDiscount[]): OfferSummary | null {
    let percentOff = 0
    let endsAt: Date | null = null
    // The listing's own grouping rule, so the count matches the grid it sits above.
    const counted = new Set<string>()

    for (const row of rows) {
        const priced = resolveEffectivePrice(row.price, row, discounts)
        if (!priced.discount) continue

        counted.add(row.familyId ?? row.id)
        percentOff = Math.max(percentOff, priced.percentOff)
        // The SOONEST end, not the latest: the banner promises a deadline, and the first
        // discount to expire is the first moment the promise stops being true for somebody.
        if (endsAt === null || priced.discount.endsAt < endsAt) endsAt = priced.discount.endsAt
    }

    if (counted.size === 0 || endsAt === null) return null
    return { percentOff, productCount: counted.size, endsAt: endsAt.toISOString() }
}

/** The site-wide strip: one question, two light queries, and null most of the time. */
export async function offersHighlight(): Promise<OfferSummary | null> {
    const discounts = await activeDiscounts()
    const where = whereForDiscounts(discounts)
    if (!where) return null

    const rows = await prisma.product.findMany({
        where,
        select: { id: true, familyId: true, subCategoryId: true, price: true },
    })
    return summariseOffers(rows, discounts)
}

/** A section banner. `scope` is the sub-category being viewed, or a whole category. */
export async function offersForSection(
    scope: { subCategoryId: string } | { categoryId: string }
): Promise<OfferSummary | null> {
    const discounts = await activeDiscounts()
    if (discounts.length === 0) return null

    const rows = await prisma.product.findMany({
        where:
            "subCategoryId" in scope
                ? { ...liveProduct, subCategoryId: scope.subCategoryId }
                : { ...liveProduct, subCategory: { categoryId: scope.categoryId } },
        select: { id: true, familyId: true, subCategoryId: true, price: true },
    })
    return summariseOffers(rows, discounts)
}

/**
 * Everything on offer, grouped by the section it belongs to.
 *
 * Grouped rather than a flat grid because "what is on sale" is a browsing question, and a
 * hundred unrelated tiles answer it worse than four named groups do — the same argument the
 * catalogue itself makes by having sections at all.
 */
export async function allOffers(locale: Locale): Promise<{ summary: OfferSummary; groups: OfferGroup[] } | null> {
    const discounts = await activeDiscounts()
    const where = whereForDiscounts(discounts)
    if (!where) return null

    const products = await prisma.product.findMany({
        where,
        include: productLinkedCardInclude(locale),
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
    })

    const summary = summariseOffers(products, discounts)
    if (!summary) return null

    const groups = new Map<string, OfferGroup>()
    const seen = new Set<string>()
    for (const product of products) {
        // The resolver decides membership, not the query: a family-scoped discount can pull one
        // product out of a sub-category the `where` had to widen to.
        const priced = resolveEffectivePrice(product.price, product, discounts)
        if (!priced.discount) continue

        // One card per family here as well. The catalogue's listings deduplicate (§6), and an
        // offers page that showed five wattages of one fixture as five offers would look like
        // a bigger sale than it is.
        const key = product.familyId ?? product.id
        if (seen.has(key)) continue
        seen.add(key)

        const subCategory = product.subCategory
        const group = groups.get(subCategory.id)
        const card = toCardView(product, discounts)

        if (group) {
            group.products.push(card)
            continue
        }

        groups.set(subCategory.id, {
            subCategoryId: subCategory.id,
            name: subCategory.translations[0]?.name ?? "",
            // Slugs live on the translation rows and are per-locale (§9.2); a link built from
            // the entity would 404 in Arabic.
            slug: subCategory.translations[0]?.slug ?? "",
            categoryName: subCategory.category.translations[0]?.name ?? "",
            categorySlug: subCategory.category.translations[0]?.slug ?? "",
            summary: { percentOff: 0, productCount: 0, endsAt: summary.endsAt },
            products: [card],
        })
    }

    // Each group's own summary, so a section can say what IT takes off rather than inheriting
    // the catalogue's best number.
    const rowsById = new Map(products.map((product) => [product.id, product]))
    for (const group of groups.values()) {
        const rows = group.products.flatMap((card) => {
            const row = rowsById.get(card.id)
            return row ? [row] : []
        })
        group.summary = summariseOffers(rows, discounts) ?? group.summary
    }

    return { summary, groups: [...groups.values()] }
}
