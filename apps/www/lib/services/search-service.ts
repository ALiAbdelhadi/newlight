import { prisma, serializeMoney, translationsFor, type Locale, type SerializedMoney } from "@repo/database"
import { liveCategory, liveProduct, liveSubCategory, productImages } from "./selectors"

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
        /** A string, not a number: Decimal cannot cross the boundary as one (ADR 0001). */
        price: SerializedMoney
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

        return {
            products: products.map((product) => {
                const subCategoryTranslation = product.subCategory.translations[0]
                const categoryTranslation = product.subCategory.category.translations[0]
                return {
                    id: product.id,
                    productId: product.productId,
                    slug: product.slug,
                    price: serializeMoney(product.price),
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
