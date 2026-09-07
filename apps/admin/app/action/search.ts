"use server"

import { serializeMoney } from "@repo/database"
import { prisma } from "@repo/database"

export async function searchProducts(searchItem: string) {
    const searchTerm = searchItem.trim()
    
    if (!searchTerm) {
        return []
    }

    const searchLocale = "en"

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
            // order 0 is the primary image (§5); the column this replaced is gone.
            images: { orderBy: { order: "asc" as const }, take: 1 },
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
        take: 10,
    })

    return products.map(product => {
        const translation = product.translations[0]
        const subCategoryTranslation = product.subCategory?.translations[0]
        const categoryTranslation = product.subCategory?.category?.translations[0]

        return {
            id: product.id,
            productId: product.productId,
            slug: product.slug,
            price: serializeMoney(product.price),
            image: product.images[0]?.url ?? null,
            name: translation?.name || "",
            description: translation?.description || null,
            categoryName: categoryTranslation?.name,
            categorySlug: categoryTranslation?.slug,
            subCategoryName: subCategoryTranslation?.name,
            subCategorySlug: subCategoryTranslation?.slug,
        }
    })
}

