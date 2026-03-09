import { prisma, Product as PrismaProduct } from "@repo/database"
import { getLocaleOrDefault } from "../db"
import { Product } from "@/types"

export interface ProductWithTranslations extends Omit<PrismaProduct, 'translations'> {
    translations: Array<{
        name: string
        description: string | null
        locale: string
    }>
    subCategory?: {
        translations: Array<{ name: string; locale: string }>
        category: {
            translations: Array<{ name: string; locale: string }>
            categoryType: string
        }
    }
}

export class ProductService {
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

    /**
     * Get product by ID with translations
     */
    static async getProduct(
        productId: string,
        locale: string = "en"
    ): Promise<ProductWithTranslations | null> {
        const product = await prisma.product.findUnique({
            where: { productId },
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        })

        return product as any
    }

    /**
     * Get multiple products by IDs
     */
    static async getProducts(
        productIds: string[],
        locale: string = "en"
    ): Promise<ProductWithTranslations[]> {
        const products = await prisma.product.findMany({
            where: {
                productId: { in: productIds },
            },
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        })

        return products as any
    }

    static async getAllProducts(locale?: string, limit?: number): Promise<Product[]> {
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
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale) as any
        }))

        const sorted = await this.sortAlphabetically(mappedProducts as any, resolvedLocale)
        return sorted as unknown as Product[]
    }

    static async getProductsByIds(productIds: string[], locale?: string): Promise<Product[]> {
        const resolvedLocale = await getLocaleOrDefault(locale)
        const products = await prisma.product.findMany({
            where: {
                productId: {
                    in: productIds,
                },
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

        const mappedProducts = products.map(product => ({
            ...product,
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale) as any
        }))

        const orderedProducts = productIds
            .map(id => mappedProducts.find(p => p.productId === id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined)

        return orderedProducts as unknown as Product[]
    }

    /**
     * Check product availability
     */
    static async checkAvailability(
        productId: string,
        quantity: number
    ): Promise<{ available: boolean; inventory?: number }> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { inventory: true },
        })

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND")
        }

        return {
            available: product.inventory >= quantity,
            inventory: product.inventory,
        }
    }

    static async reserveInventory(
        productId: string,
        quantity: number
    ): Promise<{ success: boolean }> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { id: true, inventory: true },
        })

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND")
        }

        if (product.inventory < quantity) {
            throw new Error("INSUFFICIENT_INVENTORY")
        }

        await prisma.product.update({
            where: { productId },
            data: {
                inventory: {
                    decrement: quantity,
                },
            },
        })

        return { success: true }
    }

    static async releaseInventory(
        productId: string,
        quantity: number
    ): Promise<{ success: boolean }> {
        await prisma.product.update({
            where: { productId },
            data: {
                inventory: {
                    increment: quantity,
                },
            },
        })

        return { success: true }
    }

    /**
     * Get product price
     */
    static async getProductPrice(productId: string): Promise<number> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { price: true },
        })

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND")
        }

        return product.price
    }

    /**
     * Search products
     */
    static async searchProducts(params: {
        query?: string
        categoryId?: string
        subCategoryId?: string
        locale?: string
        skip?: number
        take?: number
    }): Promise<ProductWithTranslations[]> {
        const { query, categoryId, subCategoryId, locale = "en", skip = 0, take = 20 } = params

        const where: any = {}

        if (query) {
            where.OR = [
                {
                    translations: {
                        some: {
                            name: { contains: query, mode: "insensitive" },
                            locale,
                        },
                    },
                },
                {
                    productId: { contains: query, mode: "insensitive" },
                },
            ]
        }

        if (subCategoryId) {
            where.subCategoryId = subCategoryId
        } else if (categoryId) {
            where.subCategory = {
                categoryId,
            }
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                translations: {
                    where: { locale },
                    take: 1,
                },
                subCategory: {
                    include: {
                        translations: {
                            where: { locale },
                            take: 1,
                        },
                        category: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
        })

        return products as any
    }

    static async getProductVariants(
        productId: string,
        locale?: string
    ) {
        const resolvedLocale = await getLocaleOrDefault(locale)

        const product = await prisma.product.findUnique({
            where: { productId, isActive: true },
            select: { baseProductId: true }
        })

        if (!product || !product.baseProductId) {
            return []
        }

        const variants = await prisma.product.findMany({
            where: {
                baseProductId: product.baseProductId,
                isActive: true,
            },
            orderBy: {
                displayOrder: 'asc'
            },
            include: {
                translations: {
                    where: { locale: resolvedLocale }
                }
            }
        })

        return variants.map(variant => ({
            ...variant,
            name: variant.translations[0]?.name || variant.productId,
            colorImageMap: variant.colorImageMap as Record<string, string[]> | null,
        })) as any
    }

    static async getProductByIdWithVariants(
        productId: string,
        locale?: string
    ): Promise<Product | null> {
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

        if (!product) {
            return null
        }

        const variants = await this.getProductVariants(productId, resolvedLocale)

        return {
            ...product,
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale),
            variants: variants,
            colorImageMap: product.colorImageMap as Record<string, string[]> | null,
        } as unknown as Product
    }

    static async getProductBySlugWithVariants(
        slug: string,
        locale?: string
    ): Promise<Product | null> {
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

        if (!product) {
            return null
        }

        const variants = await this.getProductVariants(product.productId, resolvedLocale)

        return {
            ...product,
            specifications: this.extractSpecifications(product, resolvedLocale),
            translations: product.translations.filter(t => t.locale === resolvedLocale),
            variants: variants,
            colorImageMap: product.colorImageMap as Record<string, string[]> | null,
        } as unknown as Product
    }
}