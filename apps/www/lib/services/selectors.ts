import {
    DEFAULT_LOCATION_ID,
    Prisma,
    resolveEffectivePrice,
    translationsFor,
    type ActiveDiscount,
    type Locale,
    type SerializedMoney,
} from "@repo/database"

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

/**
 * A product card on a LISTING that can be filtered — the sub-category page.
 *
 * Everything a tile needs, plus the three things the filter bar can legitimately narrow by,
 * and nothing else. Each was chosen because the database can actually answer it:
 *
 *   `colorTemperatures` is a scalar enum array on the product row, so it costs no join.
 *   `availableColors` is a real relation to `ProductColor`, which the admin's Reference data
 *     screen maintains — the finishes are operator-managed, not a hardcoded list.
 *   `stockLevels` is the ledger's derived level at the main location. Availability is
 *     `onHand - reserved`, which is the same arithmetic `countLowStock` and the admin's stock
 *     column use; a filter that compared `onHand` alone would call a fully-reserved product
 *     in stock.
 *   `specs` joins `ProductSpec` to `SpecDefinition`, which carries the label, the unit and the
 *     value type. Which specs a listing may offer is `SubCategorySpec`'s answer; which of those
 *     are worth a control is decided from the data in `product-facets.ts`.
 */
export function productListCardInclude(locale: Locale) {
    return {
        translations: translationsFor(locale),
        /*
         * The FAMILY's own name, for the tile.
         *
         * A listing collapses a family to one card (§6), and the card was labelled with one
         * member's name — so five wattages of `nl-a603` were represented by whichever variant
         * sorted first, and the tile claimed to be the 6W. The family is what the tile IS.
         */
        family: { include: { translations: translationsFor(locale) } },
        images: productImages,
        availableColors: { include: { color: true }, orderBy: { order: "asc" as const } },
        stockLevels: {
            where: { locationId: DEFAULT_LOCATION_ID },
            select: { onHand: true, reserved: true },
        },
        /*
         * Specs, joined to their definition so a facet has the label, the unit and the value
         * type without a second query. `SubCategorySpec` decides which of these a listing
         * offers; `product-facets.ts` decides which of THOSE are worth a control.
         */
        specs: productSpecs,
    } satisfies Prisma.ProductInclude
}

export type ProductListCard = Prisma.ProductGetPayload<{
    include: ReturnType<typeof productListCardInclude>
}>
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
export function toCardView<
    T extends {
        id: string
        familyId: string | null
        subCategoryId: string
        price: Prisma.Decimal
        averageCost: Prisma.Decimal | null
    },
>(product: T, discounts: readonly ActiveDiscount[] = []): CardView<T> {
    const { averageCost: _cost, price, ...rest } = product
    void _cost

    /*
     * `price` IS WHAT THE CUSTOMER PAYS. A discount is an overlay (migration 0015), so a
     * component that renders `price` renders what the checkout will charge whether or not it
     * knows a sale is running — which is what stops "but the tile said 850" from becoming a
     * support ticket. `basePrice` is the struck-through number and equals `price` when nothing
     * is on offer, so no caller has to branch on a null.
     *
     * The default empty `discounts` is the no-sale case, and it costs one function call: a
     * caller that has not been taught about discounts yet still gets a correct base price
     * rather than a wrong discounted one.
     */
    const resolved = resolveEffectivePrice(price, product, discounts)

    return {
        ...rest,
        price: resolved.effective,
        basePrice: resolved.base,
        discountPercent: resolved.percentOff,
        isDiscounted: resolved.discount !== null,
    }
}

export type CardView<T extends { price: Prisma.Decimal; averageCost: Prisma.Decimal | null }> = Omit<
    T,
    "price" | "averageCost"
> & {
    /** What the customer pays right now — discounted where a discount is running. */
    price: SerializedMoney
    /** `products.price`. Equal to `price` when nothing is discounted. */
    basePrice: SerializedMoney
    /** Whole percent off, for the badge. 0 when nothing is discounted. */
    discountPercent: number
    isDiscounted: boolean
}
