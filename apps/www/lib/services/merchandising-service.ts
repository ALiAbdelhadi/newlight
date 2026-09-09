import { encodeSlug, prisma, type ActiveDiscount, type Locale, type SerializedMoney } from "@repo/database"

import { activeDiscounts } from "@/lib/discounts"
import { CategoryService } from "./category-service"
import { allOffers } from "./offers-service"
import { ProductService } from "./product-service"
import { liveProduct, productLinkedCardInclude, toCardView, type CardView, type ProductLinkedCard } from "./selectors"

/**
 * The merchandising strips: which products to show WHERE, and why.
 *
 * Every strip on the storefront reads through this file and comes out as the same card, so a
 * "new arrivals" tile on the homepage and a "you may also like" tile on a product page are the
 * same tile — the same link, the same price resolution, the same one-per-family rule.
 *
 * Nothing here is curated or flagged. Each list is DERIVED from something the shop already
 * records — when a product was added, what has actually shipped, which section it sits in —
 * so no one has to remember to update a list, and a list that has nothing to say (a shop with
 * no orders yet) returns empty and its section renders nothing rather than a placeholder.
 */

export interface StripCard {
    id: string
    /** The SKU. What "recently viewed" stores, because it is the id a customer can see. */
    sku: string
    slug: string
    name: string
    image: string
    section: string
    categorySlug: string
    subCategorySlug: string
    price: SerializedMoney
    basePrice: SerializedMoney
    discountPercent: number
}

const FALLBACK_IMAGE = "/lighting-product.jpg"

/** A row that has already been through `toCardView` — the offers service hands these over. */
type PricedLinkedRow = CardView<ProductLinkedCard>

function fromPricedRow(row: PricedLinkedRow): StripCard {
    return {
        id: row.id,
        sku: row.productId,
        slug: encodeSlug(row.slug),
        name: row.translations[0]?.name ?? row.productId,
        image: row.images[0]?.url ?? FALLBACK_IMAGE,
        section: row.subCategory.translations[0]?.name ?? "",
        categorySlug: encodeSlug(row.subCategory.category.translations[0]?.slug ?? ""),
        subCategorySlug: encodeSlug(row.subCategory.translations[0]?.slug ?? ""),
        price: row.price,
        basePrice: row.basePrice,
        discountPercent: row.discountPercent,
    }
}

function toStripCard(row: ProductLinkedCard, discounts: readonly ActiveDiscount[]): StripCard {
    return fromPricedRow(toCardView(row, discounts))
}

/**
 * One card per family, in the order given (§6). Five wattages of one fixture are one product
 * to a reader; a strip that showed all five would be one product wearing five hats.
 */
function onePerFamily<T extends { id: string; familyId: string | null }>(rows: readonly T[]): T[] {
    const seen = new Set<string>()
    const out: T[] = []
    for (const row of rows) {
        const key = row.familyId ?? row.id
        if (seen.has(key)) continue
        seen.add(key)
        out.push(row)
    }
    return out
}

/** Over-fetch, so that collapsing families still leaves `limit` cards. */
const FAMILY_HEADROOM = 3

/* -------------------------------------------------------------- new arrivals */

export async function newestProducts(locale: Locale, limit = 12): Promise<StripCard[]> {
    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: liveProduct,
            orderBy: { createdAt: "desc" },
            take: limit * FAMILY_HEADROOM,
            include: productLinkedCardInclude(locale),
        }),
        activeDiscounts(),
    ])
    return onePerFamily(rows)
        .slice(0, limit)
        .map((row) => toStripCard(row, discounts))
}

/* -------------------------------------------------------------- best sellers */

/**
 * Ranked by units on orders that were not cancelled — what has ACTUALLY been bought, not a
 * `isBestSeller` flag someone would have to keep honest. Empty until the shop has orders,
 * which is the right answer for a new shop and the reason the section can disappear.
 */
export async function bestSellers(locale: Locale, limit = 12): Promise<StripCard[]> {
    const ranked = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { status: { not: "cancelled" } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit * FAMILY_HEADROOM,
    })
    if (ranked.length === 0) return []

    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: { id: { in: ranked.map((entry) => entry.productId) }, ...liveProduct },
            include: productLinkedCardInclude(locale),
        }),
        activeDiscounts(),
    ])

    const rank = new Map(ranked.map((entry, index) => [entry.productId, index]))
    const ordered = [...rows].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    return onePerFamily(ordered)
        .slice(0, limit)
        .map((row) => toStripCard(row, discounts))
}

/* ------------------------------------------------------------------ related */

/**
 * Other products in the same section, excluding the one being viewed and its own family —
 * the family is already on the page as the variant selector.
 */
export async function relatedProducts(
    product: { id: string; familyId: string | null; subCategoryId: string },
    locale: Locale,
    limit = 8
): Promise<StripCard[]> {
    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: {
                ...liveProduct,
                subCategoryId: product.subCategoryId,
                id: { not: product.id },
                ...(product.familyId ? { OR: [{ familyId: null }, { familyId: { not: product.familyId } }] } : {}),
            },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
            take: limit * FAMILY_HEADROOM,
            include: productLinkedCardInclude(locale),
        }),
        activeDiscounts(),
    ])
    return onePerFamily(rows)
        .slice(0, limit)
        .map((row) => toStripCard(row, discounts))
}

/* --------------------------------------------------------- category highlights */

/** Featured products of a category first, then its newest — for the category landing. */
export async function categoryHighlights(categoryId: string, locale: Locale, limit = 12): Promise<StripCard[]> {
    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: { ...liveProduct, subCategory: { categoryId } },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: limit * FAMILY_HEADROOM,
            include: productLinkedCardInclude(locale),
        }),
        activeDiscounts(),
    ])
    return onePerFamily(rows)
        .slice(0, limit)
        .map((row) => toStripCard(row, discounts))
}

/**
 * What is on offer inside one category, round-robin across its sections so one large sale
 * does not fill every slot — the same rule the homepage offers strip uses.
 */
export async function categoryOffers(
    locale: Locale,
    categorySlug: string,
    limit = 12
): Promise<{ percentOff: number; cards: StripCard[] } | null> {
    const offers = await allOffers(locale)
    if (!offers) return null

    const groups = offers.groups.filter((group) => group.categorySlug === categorySlug)
    if (groups.length === 0) return null

    const cards: StripCard[] = []
    for (let index = 0; cards.length < limit; index += 1) {
        const before = cards.length
        for (const group of groups) {
            const product = group.products[index]
            if (!product || cards.length >= limit) continue
            cards.push(fromPricedRow(product))
        }
        if (cards.length === before) break
    }

    const percentOff = Math.max(...groups.map((group) => group.summary.percentOff))
    return cards.length > 0 ? { percentOff, cards } : null
}

/* ---------------------------------------------------------- shop by category */

export interface SubCategoryTile {
    id: string
    name: string
    parent: string
    href: string
    imageUrl: string | null
    count: number
}

export async function subCategoryTiles(locale: Locale): Promise<SubCategoryTile[]> {
    const categories = await CategoryService.getAllCategories(locale)
    return categories.flatMap((category) => {
        const parent = category.translations[0]
        if (!parent) return []
        return category.subCategories.flatMap((subCategory) => {
            const translation = subCategory.translations[0]
            if (!translation || subCategory._count.products === 0) return []
            return [
                {
                    id: subCategory.id,
                    name: translation.name,
                    parent: parent.name,
                    href: `/category/${encodeSlug(parent.slug)}/${encodeSlug(translation.slug)}`,
                    imageUrl: subCategory.imageUrl,
                    count: subCategory._count.products,
                },
            ]
        })
    })
}

/* ---------------------------------------------------------- recently viewed */

/**
 * Cards for a list of SKUs, in that order, priced NOW.
 *
 * "Recently viewed" stores SKUs in the browser and nothing else, then asks for the cards here
 * — so a discount that ended since the visit is not shown as still running, and a product that
 * was retired is simply absent.
 */
export async function cardsForSkus(skus: readonly string[], locale: Locale): Promise<StripCard[]> {
    if (skus.length === 0) return []
    const [rows, discounts] = await Promise.all([ProductService.getProductsByIds([...skus], locale), activeDiscounts()])
    return rows.map((row) => toStripCard(row, discounts))
}
