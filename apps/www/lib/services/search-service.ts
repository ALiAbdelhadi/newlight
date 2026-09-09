import { prisma, resolveEffectivePrice, translationsFor, type Locale, type SerializedMoney } from "@repo/database"
import { activeDiscounts } from "@/lib/discounts"
import { liveCategory, liveProduct, liveSubCategory, productImages, productListCardInclude, toCardView } from "./selectors"
import {
    buildFacets,
    toListingProduct,
    type ListingProduct,
    type ProductFacets,
} from "./product-facets"

/**
 * Site-wide search across products and taxonomy.
 *
 * Rewritten for v2. Two defects went with the rewrite:
 *
 *   1. **The locale was hardcoded.** `searchContent` opened with `const searchLocale = "en"`
 *      and the API route passed `"en"` explicitly, so an Arabic reader searching in Arabic
 *      matched nothing and got English results for the terms that did match. It is a
 *      parameter now, and the route passes the request's locale.
 *   2. **Slugs came off the entity.** They live on the translation row (§9.2), so a search
 *      result now links to the URL for the language the reader is actually in.
 */

export interface SearchResult {
    products: Array<{
        id: string
        productId: string
        slug: string
        /** What the customer pays — discounted where a discount is live (§13.2). */
        price: SerializedMoney
        /** The undiscounted price. Equal to `price` when nothing is on offer. */
        basePrice: SerializedMoney
        discountPercent: number
        image: string | null
        name: string
        description?: string | null
        categoryName?: string
        categorySlug?: string
        subCategoryName?: string
        subCategorySlug?: string
    }>
    categories: Array<{ id: string; slug: string; name: string; description?: string | null }>
    subCategories: Array<{
        id: string
        slug: string
        name: string
        description?: string | null
        categorySlug?: string
        categoryName?: string
    }>
}

export class SearchService {
    static async searchContent(query: string, locale: Locale, limit = 20): Promise<SearchResult> {
        const term = query.trim()
        if (!term) return { products: [], categories: [], subCategories: [] }

        const contains = { contains: term, mode: "insensitive" } as const

        const [products, categoryTranslations, subCategoryTranslations] = await Promise.all([
            prisma.product.findMany({
                where: {
                    ...liveProduct,
                    OR: [
                        { productId: contains },
                        { slug: contains },
                        { translations: { some: { locale, OR: [{ name: contains }, { description: contains }] } } },
                        // Spec values, through the normalised table rather than eight columns
                        // (§2.2). valueEn only, to keep the equivalence proof intact.
                        { specs: { some: { valueEn: contains } } },
                    ],
                },
                orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
                take: limit,
                include: {
                    translations: translationsFor(locale),
                    images: { ...productImages, take: 1 },
                    subCategory: {
                        include: {
                            translations: translationsFor(locale),
                            category: { include: { translations: translationsFor(locale) } },
                        },
                    },
                },
            }),

            // Searching the TRANSLATION rows, so the slug that comes back is the one for this
            // locale — which is also the slug the result has to link to.
            prisma.categoryTranslation.findMany({
                where: { locale, category: liveCategory, OR: [{ name: contains }, { description: contains }] },
                take: limit,
            }),

            prisma.subCategoryTranslation.findMany({
                where: { locale, subCategory: liveSubCategory, OR: [{ name: contains }, { description: contains }] },
                take: limit,
                include: {
                    subCategory: { include: { category: { include: { translations: translationsFor(locale) } } } },
                },
            }),
        ])

        // One load for the whole result set, not one per hit.
        const discounts = await activeDiscounts()

        return {
            products: products.map((product) => {
                const subCategoryTranslation = product.subCategory.translations[0]
                const categoryTranslation = product.subCategory.category.translations[0]
                const priced = resolveEffectivePrice(product.price, product, discounts)
                return {
                    id: product.id,
                    productId: product.productId,
                    slug: product.slug,
                    price: priced.effective,
                    basePrice: priced.base,
                    discountPercent: priced.percentOff,
                    // order === 0 is the primary image, and `take: 1` over that ordering is it.
                    image: product.images[0]?.url ?? null,
                    name: product.translations[0]?.name ?? product.productId,
                    description: product.translations[0]?.description,
                    categoryName: categoryTranslation?.name,
                    categorySlug: categoryTranslation?.slug,
                    subCategoryName: subCategoryTranslation?.name,
                    subCategorySlug: subCategoryTranslation?.slug,
                }
            }),
            categories: categoryTranslations.map((translation) => ({
                id: translation.categoryId,
                slug: translation.slug,
                name: translation.name,
                description: translation.description,
            })),
            subCategories: subCategoryTranslations.map((translation) => ({
                id: translation.subCategoryId,
                slug: translation.slug,
                name: translation.name,
                description: translation.description,
                categorySlug: translation.subCategory.category.translations[0]?.slug,
                categoryName: translation.subCategory.category.translations[0]?.name,
            })),
        }
    }
}

/* ------------------------------------------------------- search, as a listing */

export interface SearchListingEntry {
    product: ListingProduct
    categorySlug: string
    subCategorySlug: string
    sectionName: string
}

export interface SearchListing {
    entries: SearchListingEntry[]
    facets: ProductFacets
}

/**
 * Search results in the shape the LISTING understands.
 *
 * `product-facets.ts` — the filter and sort machinery, with its own tests — was built for the
 * catalogue and search could not use a line of it, because `searchContent` returns a tile
 * payload with no stock, no colours and no specs. So a customer who searched "spot" got
 * forty-eight results in one arbitrary order with no way to narrow them, on a site whose
 * category pages have had filters for weeks.
 *
 * This is the same query with the listing's include, mapped through the same
 * `toListingProduct`. What it deliberately does NOT build is spec facets: those come from
 * `SubCategorySpec`, which is configured per section, and a result set spanning six sections
 * has no single answer for which specs matter. Colour temperature, finish, availability, sale
 * and the sort orders all apply everywhere and are all here.
 *
 * One card per family, exactly as the catalogue does — over the matches, so a search that hits
 * three wattages of one fixture returns one tile for it rather than three.
 */
export async function searchListing(query: string, locale: Locale, limit = 48): Promise<SearchListing> {
    const term = query.trim()
    const empty: SearchListing = {
        entries: [],
        facets: { colorTemperatures: [], colors: [], specs: [], inStock: 0, onSale: 0, total: 0 },
    }
    if (!term) return empty

    const contains = { contains: term, mode: "insensitive" } as const

    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: {
                ...liveProduct,
                OR: [
                    { productId: contains },
                    { slug: contains },
                    { translations: { some: { locale, OR: [{ name: contains }, { description: contains }] } } },
                    { specs: { some: { valueEn: contains } } },
                ],
            },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
            take: limit,
            include: {
                ...productListCardInclude(locale),
                subCategory: {
                    include: {
                        translations: translationsFor(locale),
                        category: { include: { translations: translationsFor(locale) } },
                    },
                },
            },
        }),
        activeDiscounts(),
    ])
    if (rows.length === 0) return empty

    const priced = rows.map((row) => toCardView(row, discounts))
    const groups = new Map<string, typeof priced>()
    for (const row of priced) {
        const key = row.familyId ?? row.id
        const group = groups.get(key) ?? []
        group.push(row)
        groups.set(key, group)
    }

    const entries: SearchListingEntry[] = []
    const seen = new Set<string>()
    for (const row of priced) {
        const key = row.familyId ?? row.id
        if (seen.has(key)) continue
        seen.add(key)
        const family = groups.get(key) ?? [row]
        const source = rows.find((candidate) => candidate.id === row.id)
        entries.push({
            product: toListingProduct(row, family, locale),
            categorySlug: source?.subCategory.category.translations[0]?.slug ?? "",
            subCategorySlug: source?.subCategory.translations[0]?.slug ?? "",
            sectionName: source?.subCategory.translations[0]?.name ?? "",
        })
    }

    const colorKeys = [...new Set(entries.flatMap((entry) => entry.product.colorKeys))]
    const colors = colorKeys.length
        ? await prisma.productColor.findMany({ where: { key: { in: colorKeys } } })
        : []
    const colorNames = new Map(
        colors.map((color) => [color.key, { name: locale === "ar" ? color.nameAr : color.nameEn, hex: color.hex }])
    )

    return {
        entries,
        // `specs: []` is not a stub — see the note above. An empty facet renders no control.
        facets: { ...buildFacets(entries.map((entry) => entry.product), colorNames, locale), specs: [] },
    }
}
