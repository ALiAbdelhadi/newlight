import { prisma } from "@repo/database"
import { getLocaleOrDefault } from "../db"
import { SubCategory, Category } from "@/types"

export class CategoryService {
    private static extractSpecifications(product: any, locale: string): Record<string, string | number | string[]> | null {
        const translation = product.translations?.find((t: any) => t.locale === locale)
        const specs = translation?.specifications

        if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
            return null
        }

        const record = specs as Record<string, unknown>
        const result: Record<string, string | number | string[]> = {}
        let hasValidEntries = false

        for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'string' || typeof value === 'number' || Array.isArray(value)) {
                result[key] = value as string | number | string[]
                hasValidEntries = true
            }
        }

        return hasValidEntries ? result : null
    }

    private static async sortAlphabetically<T extends {
        order?: number
        isFeatured?: boolean
        translations?: Array<{ locale: string; name: string }>
    }>(
        items: T[],
        locale: string
    ): Promise<T[]> {
        return [...items].sort((a, b) => {
            if (a.isFeatured !== undefined && b.isFeatured !== undefined) {
                if (a.isFeatured && !b.isFeatured) return -1
                if (!a.isFeatured && b.isFeatured) return 1
            }

            if (a.order !== undefined && b.order !== undefined) {
                if (a.order !== b.order) {
                    return a.order - b.order
                }
            }

            const nameA = a.translations?.find((t) => t.locale === locale)?.name || ""
            const nameB = b.translations?.find((t) => t.locale === locale)?.name || ""

            return nameA.localeCompare(nameB, locale === "ar" ? "ar" : "en", {
                numeric: true,
                sensitivity: "base",
            })
        })
    }

    static async getCategoryBySlug(slug: string, locale?: string): Promise<Category | null> {
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
            category.subCategories = await this.sortAlphabetically(category.subCategories, resolvedLocale)
        }

        return category as unknown as Category
    }

    static async getAllCategories(locale?: string): Promise<Category[]> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const categories = await prisma.category.findMany({
            where: { isActive: true },
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
            orderBy: { order: "asc" },
        })
        return await this.sortAlphabetically(categories as any, resolvedLocale) as unknown as Category[]
    }

    static async getCategoryByType(categoryType: "indoor" | "outdoor", locale?: string): Promise<Category | null> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const category = await prisma.category.findFirst({
            where: { categoryType, isActive: true },
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
            category.subCategories = await this.sortAlphabetically(category.subCategories, resolvedLocale)
        }

        return category as unknown as Category
    }

    static async getSubCategoryBySlug(categorySlug: string, subCategorySlug: string, locale?: string): Promise<SubCategory | null> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const subCategory = await prisma.subCategory.findFirst({
            where: {
                slug: subCategorySlug,
                category: { slug: categorySlug },
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
                specifications: this.extractSpecifications(product, resolvedLocale),
                translations: product.translations.filter(t => t.locale === resolvedLocale) as any
            }))

            subCategory.products = await this.sortAlphabetically(subCategory.products as any, resolvedLocale)
        }

        return subCategory as unknown as SubCategory
    }

    static async getProductsWithUniqueVariants(
        categorySlug: string,
        subCategorySlug: string,
        locale?: string
    ): Promise<SubCategory | null> {
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
                    orderBy: [
                        { isFeatured: "desc" },
                        { displayOrder: "asc" },
                        { order: "asc" }
                    ],
                    include: {
                        translations: true,
                    },
                },
            },
        })

        if (!subCategory) {
            return null
        }

        const seenBaseProducts = new Set<string>()
        const uniqueProducts = subCategory.products.filter(product => {
            const baseId = product.baseProductId || product.productId
            if (seenBaseProducts.has(baseId)) {
                return false
            }
            seenBaseProducts.add(baseId)
            return true
        })

        const mappedProducts = uniqueProducts.map(product => ({
            ...product,
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale),
            colorImageMap: product.colorImageMap as Record<string, string[]> | null,
        }))

        return {
            ...subCategory,
            products: await this.sortAlphabetically(mappedProducts as any, resolvedLocale)
        } as unknown as SubCategory
    }

    static async getSubCategories(categorySlug: string, locale?: string): Promise<any[]> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const subCategories = await prisma.subCategory.findMany({
            where: {
                category: { slug: categorySlug },
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
        return await this.sortAlphabetically(subCategories as any, resolvedLocale)
    }

    static async getFooterSubCategories(locale: string): Promise<any[]> {
        try {
            const subCategories = await prisma.subCategory.findMany({
                where: { isActive: true },
                include: {
                    translations: { where: { locale } },
                    category: {
                        include: {
                            translations: { where: { locale } },
                        },
                    },
                },
                orderBy: { order: "asc" },
            });

            return subCategories.map((subCat) => ({
                id: subCat.id,
                slug: subCat.slug,
                name: subCat.translations[0]?.name || subCat.slug,
                categorySlug: subCat.category?.slug || "",
                categoryType: subCat.category?.categoryType,
            }));
        } catch (error) {
            console.error("Error fetching footer sub-categories:", error);
            return [];
        }
    }
}
