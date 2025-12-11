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
function extractSpecifications(product: any, locale: string) {
    const translation = product.translations?.find((t: any) => t.locale === locale)
    return translation?.specifications || null
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
                orderBy: { order: "asc" },
                include: {
                    translations: true, // جلب جميع الترجمات لاستخراج المواصفات
                },
            },
        },
    })

    // استخراج المواصفات للمنتجات
    if (subCategory?.products) {
        subCategory.products = subCategory.products.map(product => ({
            ...product,
            specifications: extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale)
        }))
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

    return subCategories
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

    return products.map(product => ({
        ...product,
        specifications: extractSpecifications(product, resolvedLocale),
        translations: product.translations.filter(t => t.locale === resolvedLocale)
    }))
}

export async function getAllCategories() {
    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
        },
        select: {
            slug: true,
            categoryType: true,
        },
        orderBy: { order: "asc" },
    })

    return categories
}