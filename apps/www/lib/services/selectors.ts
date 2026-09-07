import { Prisma, serializeMoney, translationsFor, type Locale, type SerializedMoney } from "@repo/database"

/**
 * The shared Prisma fragments every storefront read is built from.
 *
 * They exist for two reasons. First, `translationsFor(locale)` is the fix for §14.4's eight
 * `take: 1` sites with no `where: { locale }` — a query that spells its include by hand can
 * forget the locale, and one that composes a fragment cannot. Second, every one of these
 * gives the caller a Prisma-DERIVED type, which is what lets the service layer drop the
 * `as unknown as Category` casts §0.1 forbids: the payload type is computed from the query
 * rather than asserted over it.
 */

/** Product images, primary first. order === 0 IS the primary; there is no isPrimary flag (§5). */
export const productImages = { orderBy: { order: "asc" as const } }

/** Specs joined to their definition, so a caller has the label and unit without a second query. */
export const productSpecs = {
    include: { spec: true },
    orderBy: { spec: { order: "asc" as const } },
}

export function productAvailableColors() {
    return { include: { color: true }, orderBy: { order: "asc" as const } }
}

/** A product card: enough to render a tile, and nothing more. */
export function productCardInclude(locale: Locale) {
    return {
        translations: translationsFor(locale),
        images: productImages,
    } satisfies Prisma.ProductInclude
}

/** A product page: everything the detail view renders. */
export function productDetailInclude(locale: Locale) {
    return {
        translations: translationsFor(locale),
        images: productImages,
        specs: productSpecs,
        availableColors: productAvailableColors(),
        family: { include: { translations: translationsFor(locale) } },
        subCategory: {
            include: {
                translations: translationsFor(locale),
                category: { include: { translations: translationsFor(locale) } },
            },
        },
    } satisfies Prisma.ProductInclude
}

export type ProductCard = Prisma.ProductGetPayload<{ include: ReturnType<typeof productCardInclude> }>
export type ProductDetail = Prisma.ProductGetPayload<{ include: ReturnType<typeof productDetailInclude> }>

/**
 * Soft delete is a filter, not a convention (§14). Every storefront read composes this, so
 * "did we remember to exclude deleted rows" has one answer instead of one per query.
 */
export const liveProduct = { isActive: true, deletedAt: null } satisfies Prisma.ProductWhereInput
export const liveSubCategory = { isActive: true, deletedAt: null } satisfies Prisma.SubCategoryWhereInput
export const liveCategory = { isActive: true, deletedAt: null } satisfies Prisma.CategoryWhereInput

/**
 * A card that has to build its own link — the homepage grid, search results.
 *
 * Separate from productCardInclude because a category listing already knows which category it
 * is in, and joining two taxonomy levels plus their translations on every tile of every
 * listing is work those pages do not need.
 */
export function productLinkedCardInclude(locale: Locale) {
    return {
        translations: translationsFor(locale),
        images: productImages,
        subCategory: {
            include: {
                translations: translationsFor(locale),
                category: { include: { translations: translationsFor(locale) } },
            },
        },
    } satisfies Prisma.ProductInclude
}

export type ProductLinkedCard = Prisma.ProductGetPayload<{ include: ReturnType<typeof productLinkedCardInclude> }>

/**
 * A product row that is safe to hand to a Client Component.
 *
 * Two things make a raw row unsafe, and both were shipping:
 *
 *   `price` is a `Prisma.Decimal`, and React refuses to serialise one across the RSC
 *   boundary — "Only plain objects can be passed to Client Components". The pages that did it
 *   called `serializeMoney` on the far side, which is the money boundary enforced on the wrong
 *   side of itself: what arrived was no longer a Decimal (§4, ADR 0001).
 *
 *   `averageCost` is what NewLight PAYS. Spreading the row put it in the payload that reaches
 *   every customer's browser. It is null today only because no cost has been recorded yet, and
 *   §8.4's bulk cost entry exists to change that.
 *
 * Applying this at the service boundary is the point: a page that has to remember is a page
 * that will forget.
 */
export function toCardView<T extends { price: Prisma.Decimal; averageCost: Prisma.Decimal | null }>(
    product: T
): Omit<T, "price" | "averageCost"> & { price: SerializedMoney } {
    const { averageCost: _cost, price, ...rest } = product
    void _cost
    return { ...rest, price: serializeMoney(price) }
}
