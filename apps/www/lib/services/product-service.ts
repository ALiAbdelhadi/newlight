import { prisma, Product } from "@repo/database"

export interface ProductWithTranslations extends Product {
    translations: Array<{
        name: string
        description?: string
        locale: string
    }>
    subCategory: {
        translations: Array<{ name: string; locale: string }>
        category: {
            translations: Array<{ name: string; locale: string }>
            categoryType: string
        }
    }
}

export class ProductService {
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

        return product
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

        return products
    }

    /**
     * Check product availability
     */
    static async checkAvailability(
        productId: string,
        quantity: number
    ): Promise<{ available: boolean; stock?: number }> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { stock: true },
        })

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND")
        }

        return {
            available: product.stock >= quantity,
            stock: product.stock,
        }
    }

    /**
     * Reserve inventory (decrease stock)
     */
    static async reserveInventory(
        productId: string,
        quantity: number
    ): Promise<{ success: boolean }> {
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { id: true, stock: true },
        })

        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND")
        }

        if (product.stock < quantity) {
            throw new Error("INSUFFICIENT_INVENTORY")
        }

        await prisma.product.update({
            where: { productId },
            data: {
                stock: {
                    decrement: quantity,
                },
            },
        })

        return { success: true }
    }

    /**
     * Release inventory (increase stock) - for cancellations
     */
    static async releaseInventory(
        productId: string,
        quantity: number
    ): Promise<{ success: boolean }> {
        await prisma.product.update({
            where: { productId },
            data: {
                stock: {
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

        return products
    }
}