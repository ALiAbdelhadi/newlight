"use server"

import {
    Prisma,
    prisma,
    resolveLocale,
    serializeMoney,
    translationsFor,
    type Locale,
    type SerializedMoney,
} from "@repo/database"

/**
 * Product search, rewritten onto ProductSpec (BUILD §2.2).
 *
 * v1 filtered eight specification COLUMNS on Product. Those columns are gone in v2 — the
 * values live in ProductSpec, indexed by @@index([specKey, valueEn]) and
 * @@index([specKey, valueNumber]), which is exactly what those indexes are for. Keeping the
 * columns so that search could stay as it was would have rebuilt the two-sources-of-truth
 * problem the migration exists to remove.
 *
 * Two deliberate decisions, both recorded so the equivalence proof stays honest:
 *
 *   1. Spec searching reads `valueEn` ONLY. ProductSpec carries valueAr as well, and
 *      searching both would return a strict superset — an improvement, but one that breaks
 *      the "same results on the same data" proof. Arabic spec-value search is a separate,
 *      opt-in change rather than something smuggled into a migration.
 *
 *   2. `colorTemp` and `ipRating` NOW FILTER. In v1 both were declared in the signature,
 *      destructured, and then never used in the where clause, so passing them changed
 *      nothing. Preserving "current semantics" literally would mean keeping them inert.
 *      This is a behaviour change and is marked as one.
 */

/** The spec keys whose values a free-text search looks inside. */
const SEARCHABLE_SPEC_KEYS = [
    "voltage",
    "brand_of_led",
    "luminous_flux",
    "main_material",
    "cri",
    "product_dimensions",
    "hole_size",
    "power_factor",
] as const

/** Spec keys surfaced on a result card. */
const RESULT_SPEC_KEYS = ["maximum_wattage", "voltage", "ip_rating"] as const

export interface SearchResultImage {
    url: string
    /** null while a placeholder has not been generated; rendering must never block on it. */
    blurDataUrl: string | null
    width: number | null
    height: number | null
    alt: string | null
}

export interface SearchResult {
    id: string
    productId: string
    slug: string
    /** A string, not a number: Decimal cannot cross the server/client boundary (§4). */
    price: SerializedMoney
    images: SearchResultImage[]
    name: string
    description: string | null
    categoryName: string | undefined
    categorySlug: string | undefined
    subCategoryName: string | undefined
    subCategorySlug: string | undefined
    maxWattage: string | null
    voltage: string | null
    colorTemperatures: string[]
    ipRating: string | null
}

/** One include, so the two entry points cannot drift in what they select. */
function resultInclude(locale: Locale) {
    return {
        translations: translationsFor(locale),
        images: { orderBy: { order: "asc" as const } },
        specs: { where: { specKey: { in: [...RESULT_SPEC_KEYS] } } },
        subCategory: {
            include: {
                translations: translationsFor(locale),
                category: { include: { translations: translationsFor(locale) } },
            },
        },
    } satisfies Prisma.ProductInclude
}

type ProductWithIncludes = Prisma.ProductGetPayload<{ include: ReturnType<typeof resultInclude> }>

function toResult(product: ProductWithIncludes, locale: Locale): SearchResult {
    const translation = product.translations[0]
    const subCategoryTranslation = product.subCategory?.translations[0]
    const categoryTranslation = product.subCategory?.category?.translations[0]
    const spec = (key: string) => product.specs.find((s) => s.specKey === key)?.valueEn ?? null

    return {
        id: product.id,
        productId: product.productId,
        slug: product.slug,
        price: serializeMoney(product.price),
        images: product.images.map((image) => ({
            url: image.url,
            blurDataUrl: image.blurDataUrl,
            width: image.width,
            height: image.height,
            alt: (locale === "ar" ? image.altAr : image.altEn) ?? translation?.name ?? null,
        })),
        name: translation?.name ?? "",
        description: translation?.description ?? null,
        categoryName: categoryTranslation?.name,
        categorySlug: categoryTranslation?.slug,
        subCategoryName: subCategoryTranslation?.name,
        subCategorySlug: subCategoryTranslation?.slug,
        maxWattage: spec("maximum_wattage"),
        voltage: spec("voltage"),
        colorTemperatures: product.colorTemperatures,
        ipRating: spec("ip_rating"),
    }
}

export async function searchProducts(searchItem: string, requestedLocale: string = "en"): Promise<SearchResult[]> {
    const searchTerm = searchItem.trim()
    if (!searchTerm) return []

    const locale = resolveLocale(requestedLocale)
    const contains = { contains: searchTerm, mode: "insensitive" } as const

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            deletedAt: null,
            OR: [
                { productId: contains },
                { slug: contains },
                {
                    translations: {
                        some: {
                            locale,
                            OR: [
                                { name: contains },
                                { description: contains },
                                { metaTitle: contains },
                                { metaDescription: contains },
                            ],
                        },
                    },
                },
                {
                    subCategory: {
                        category: {
                            translations: { some: { locale, OR: [{ name: contains }, { description: contains }] } },
                        },
                    },
                },
                {
                    subCategory: {
                        translations: { some: { locale, OR: [{ name: contains }, { description: contains }] } },
                    },
                },
                // Eight column predicates collapse into one correlated subquery. `contains`
                // compiles to LIKE '%x%', which no b-tree serves — equally true of the v1
                // columns, so this is not a regression; the specKey equality still uses the
                // index prefix. If volume ever justifies it the answer is a pg_trgm GIN
                // index on valueEn, not a retained column.
                { specs: { some: { specKey: { in: [...SEARCHABLE_SPEC_KEYS] }, valueEn: contains } } },
            ],
        },
        include: resultInclude(locale),
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
        take: 20,
    })

    // The OR can match a product through several branches; findMany already returns each row
    // once, but the dedupe is kept because it is cheap and its absence would be silent.
    return Array.from(new Map(products.map((p) => [p.id, p])).values()).map((p) => toResult(p, locale))
}

export async function advancedSearchProducts(filters: {
    searchTerm?: string
    categorySlug?: string
    subCategorySlug?: string
    minWattage?: number
    maxWattage?: number
    colorTemp?: string[]
    ipRating?: string[]
    minPrice?: number
    maxPrice?: number
    locale?: string
}): Promise<SearchResult[]> {
    const {
        searchTerm = "",
        categorySlug,
        subCategorySlug,
        minWattage,
        maxWattage,
        colorTemp,
        ipRating,
        minPrice,
        maxPrice,
    } = filters

    const locale = resolveLocale(filters.locale)
    const contains = { contains: searchTerm, mode: "insensitive" } as const
    const and: Array<Record<string, unknown>> = []

    // Taxonomy slugs moved to the translation rows and are unique per (locale, slug), so a
    // slug filter is now locale-scoped. That is a behaviour change: the same Arabic category
    // has a different slug from its English one, and callers must pass the locale they mean.
    if (categorySlug) {
        and.push({ subCategory: { category: { translations: { some: { locale, slug: categorySlug } } } } })
    }
    if (subCategorySlug) {
        and.push({ subCategory: { translations: { some: { locale, slug: subCategorySlug } } } })
    }

    // The one filter that genuinely uses @@index([specKey, valueNumber]).
    if (minWattage !== undefined || maxWattage !== undefined) {
        and.push({
            specs: {
                some: {
                    specKey: "maximum_wattage",
                    valueNumber: {
                        ...(minWattage !== undefined ? { gte: minWattage } : {}),
                        ...(maxWattage !== undefined ? { lte: maxWattage } : {}),
                    },
                },
            },
        })
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        and.push({
            price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
        })
    }

    // Previously declared and silently ignored. Now implemented — a deliberate delta.
    if (colorTemp?.length) {
        and.push({ colorTemperatures: { hasSome: colorTemp } })
    }
    if (ipRating?.length) {
        // Values are stored as "IP20"/"IP65", so a bare "20" is accepted and normalised.
        const values = ipRating.map((value) => (/^IP/i.test(value) ? value.toUpperCase() : `IP${value}`))
        and.push({ specs: { some: { specKey: "ip_rating", valueEn: { in: values } } } })
    }

    if (searchTerm) {
        and.push({
            OR: [
                { translations: { some: { locale, OR: [{ name: contains }, { description: contains }] } } },
                { productId: contains },
            ],
        })
    }

    const products = await prisma.product.findMany({
        where: { isActive: true, deletedAt: null, ...(and.length ? { AND: and } : {}) },
        include: resultInclude(locale),
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
        take: 50,
    })

    return products.map((p) => toResult(p, locale))
}
