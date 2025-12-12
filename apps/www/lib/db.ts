import { prisma } from "@repo/database"
import { getLocale } from "next-intl/server"

export async function getLocaleOrDefault(providedLocale?: string): Promise<string> {
    if (providedLocale) return providedLocale

    try {
        const locale = await getLocale()
        return locale || "en"
    } catch {
        return "en"
    }
}

interface ProductWithTranslations {
    translations?: Array<{ locale: string; specifications?: unknown }>
}

function extractSpecifications(product: ProductWithTranslations, locale: string) {
    const translation = product.translations?.find((t) => t.locale === locale)
    return translation?.specifications || null
}

function sortAlphabetically<T extends { 
    order?: number
    isFeatured?: boolean
    translations?: Array<{ locale: string; name: string }> 
}>(
    items: T[],
    locale: string
): T[] {
    return [...items].sort((a, b) => {
        if (a.isFeatured !== undefined && b.isFeatured !== undefined) {
            if (a.isFeatured && !b.isFeatured) return -1
            if (!a.isFeatured && b.isFeatured) return 1
        } else if (a.isFeatured) {
            return -1
        } else if (b.isFeatured) {
            return 1
        }

        if (a.order !== undefined && b.order !== undefined) {
            if (a.order !== b.order) {
                return a.order - b.order
            }
        } else if (a.order !== undefined) {
            return -1
        } else if (b.order !== undefined) {
            return 1
        }

        const nameA = a.translations?.find((t) => t.locale === locale)?.name || ""
        const nameB = b.translations?.find((t) => t.locale === locale)?.name || ""

        return nameA.localeCompare(nameB, locale === "ar" ? "ar" : "en", {
            numeric: true,
            sensitivity: "base",
        })
    })
}

export async function getCategoryBySlug(slug: string, locale?: string) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const category = await prisma.category.findUnique({
        where: { slug },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
            subCategories: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                    _count: {
                        select: { products: { where: { isActive: true } } },
                    },
                },
            },
        },
    })

    if (category?.subCategories) {
        category.subCategories = sortAlphabetically(category.subCategories, resolvedLocale)
    }

    return category
}

export async function getCategoryByType(categoryType: "indoor" | "outdoor", locale?: string) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const category = await prisma.category.findFirst({
        where: {
            categoryType,
            isActive: true,
        },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
            subCategories: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                    _count: {
                        select: { products: { where: { isActive: true } } },
                    },
                },
            },
        },
    })

    if (category?.subCategories) {
        category.subCategories = sortAlphabetically(category.subCategories, resolvedLocale)
    }

    return category
}

export async function getSubCategoryBySlug(categorySlug: string, subCategorySlug: string, locale?: string) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const subCategory = await prisma.subCategory.findFirst({
        where: {
            slug: subCategorySlug,
            category: {
                slug: categorySlug,
            },
            isActive: true,
        },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
            category: {
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                },
            },
            products: {
                where: { isActive: true },
                orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
                include: {
                    translations: true,
                },
            },
        },
    })

    if (subCategory?.products) {
        subCategory.products = subCategory.products.map(product => ({
            ...product,
            specifications: extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale)
        }))

        subCategory.products = sortAlphabetically(subCategory.products, resolvedLocale)
    }

    return subCategory
}

export async function getSubCategories(categorySlug: string, locale?: string) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const subCategories = await prisma.subCategory.findMany({
        where: {
            category: {
                slug: categorySlug,
            },
            isActive: true,
        },
        orderBy: { order: "asc" },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
            products: {
                where: { isActive: true },
                take: 1,
            },
        },
    })
    return sortAlphabetically(subCategories, resolvedLocale)
}

export async function getProductsBySubCategory(
    categorySlug: string,
    subCategorySlug: string,
    locale?: string
) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const subCategory = await prisma.subCategory.findFirst({
        where: {
            slug: subCategorySlug,
            category: {
                slug: categorySlug,
            },
            isActive: true,
        },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
            category: {
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                },
            },
            products: {
                where: { isActive: true },
                orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
                include: {
                    translations: true,
                },
            },
        },
    })

    if (subCategory?.products) {
        subCategory.products = subCategory.products.map(product => ({
            ...product,
            specifications: extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale)
        }))
        subCategory.products = sortAlphabetically(subCategory.products, resolvedLocale)
    }

    return subCategory
}

export async function getProductById(
    productId: string,
    locale?: string
) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const product = await prisma.product.findUnique({
        where: {
            productId,
            isActive: true,
        },
        include: {
            translations: true,
            subCategory: {
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: resolvedLocale },
                            },
                        },
                    },
                },
            },
        },
    })

    if (product) {
        return {
            ...product,
            specifications: extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale)
        }
    }

    return product
}

export async function getProductBySlug(
    slug: string,
    locale?: string
) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const product = await prisma.product.findUnique({
        where: {
            slug,
            isActive: true,
        },
        include: {
            translations: true,
            subCategory: {
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: resolvedLocale },
                            },
                        },
                    },
                },
            },
        },
    })

    if (product) {
        return {
            ...product,
            specifications: extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale)
        }
    }

    return product
}

export async function getAllProducts(locale?: string, limit?: number) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const products = await prisma.product.findMany({
        where: {
            isActive: true,
        },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
        take: limit,
        include: {
            translations: true,
            subCategory: {
                include: {
                    translations: {
                        where: { locale: resolvedLocale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: resolvedLocale },
                            },
                        },
                    },
                },
            },
        },
    })

    const mappedProducts = products.map(product => ({
        ...product,
        specifications: extractSpecifications(product, resolvedLocale),
        translations: product.translations.filter(t => t.locale === resolvedLocale)
    }))

    return sortAlphabetically(mappedProducts, resolvedLocale)
}

export async function getAllCategories(locale?: string) {
    const resolvedLocale = await getLocaleOrDefault(locale)
    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
        },
        include: {
            translations: {
                where: { locale: resolvedLocale },
            },
        },
        orderBy: { order: "asc" },
    })
    return sortAlphabetically(categories, resolvedLocale)
}

export interface SearchResult {
    products: Array<{
        id: string
        productId: string
        slug: string
        price: number
        images: string[]
        name: string
        description?: string | null
        categoryName?: string
        categorySlug?: string
        subCategoryName?: string
        subCategorySlug?: string
    }>
    categories: Array<{
        id: string
        slug: string
        name: string
        description?: string | null
    }>
    subCategories: Array<{
        id: string
        slug: string
        name: string
        description?: string | null
        categorySlug?: string
        categoryName?: string
    }>
}

export async function searchContent(query: string, locale?: string, limit: number = 20): Promise<SearchResult> {
    const searchLocale = "en"
    const searchTerm = query.trim()

    if (!searchTerm) {
        return { products: [], categories: [], subCategories: [] }
    }

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            OR: [
                {
                    productId: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    slug: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    translations: {
                        some: {
                            locale: searchLocale,
                            OR: [
                                { name: { contains: searchTerm, mode: "insensitive" } },
                                { description: { contains: searchTerm, mode: "insensitive" } },
                            ],
                        },
                    },
                },
            ],
        },
        include: {
            translations: {
                where: { locale: searchLocale },
            },
            subCategory: {
                include: {
                    translations: {
                        where: { locale: searchLocale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: searchLocale },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
        take: limit,
    })

    const normalizedSearchTerm = searchTerm.toLowerCase()
    const categoryTypeMatch: "indoor" | "outdoor" | null = 
        normalizedSearchTerm === "indoor" ? "indoor" :
        normalizedSearchTerm === "outdoor" ? "outdoor" :
        null

    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
            OR: [
                ...(categoryTypeMatch ? [{ categoryType: categoryTypeMatch }] : []),
                {
                    slug: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    translations: {
                        some: {
                            locale: searchLocale,
                            OR: [
                                { name: { contains: searchTerm, mode: "insensitive" } },
                                { description: { contains: searchTerm, mode: "insensitive" } },
                            ],
                        },
                    },
                },
            ],
        },
        include: {
            translations: {
                where: { locale: searchLocale },
            },
        },
        orderBy: { order: "asc" },
        take: limit,
    })

    const subCategories = await prisma.subCategory.findMany({
        where: {
            isActive: true,
            OR: [
                {
                    slug: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    translations: {
                        some: {
                            locale: searchLocale,
                            OR: [
                                { name: { contains: searchTerm, mode: "insensitive" } },
                                { description: { contains: searchTerm, mode: "insensitive" } },
                            ],
                        },
                    },
                },
            ],
        },
        include: {
            translations: {
                where: { locale: searchLocale },
            },
            category: {
                include: {
                    translations: {
                        where: { locale: searchLocale },
                    },
                },
            },
        },
        orderBy: { order: "asc" },
        take: limit,
    })

    const mappedProducts = products.map(product => {
        const translation = product.translations[0]
        const subCategoryTranslation = product.subCategory?.translations[0]
        const categoryTranslation = product.subCategory?.category?.translations[0]

        return {
            id: product.id,
            productId: product.productId,
            slug: product.slug,
            price: product.price,
            images: product.images,
            name: translation?.name || "",
            description: translation?.description || null,
            categoryName: categoryTranslation?.name,
            categorySlug: product.subCategory?.category?.slug,
            subCategoryName: subCategoryTranslation?.name,
            subCategorySlug: product.subCategory?.slug,
        }
    })

    const mappedCategories = categories.map(category => {
        const translation = category.translations[0]
        return {
            id: category.id,
            slug: category.slug,
            name: translation?.name || "",
            description: translation?.description || null,
        }
    })

    const mappedSubCategories = subCategories.map(subCategory => {
        const translation = subCategory.translations[0]
        const categoryTranslation = subCategory.category?.translations[0]
        return {
            id: subCategory.id,
            slug: subCategory.slug,
            name: translation?.name || "",
            description: translation?.description || null,
            categorySlug: subCategory.category?.slug,
            categoryName: categoryTranslation?.name,
        }
    })

    return {
        products: mappedProducts,
        categories: mappedCategories,
        subCategories: mappedSubCategories,
    }
}