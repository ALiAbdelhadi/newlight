"use server"

import { prisma } from "@repo/database"

export async function searchProducts(searchItem: string, locale: string = "en") {
    const searchTerm = searchItem.trim()

    if (!searchTerm) {
        return []
    }
    // Build a comprehensive search query
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
                            locale: locale,
                            OR: [
                                { name: { contains: searchTerm, mode: "insensitive" } },
                                { description: { contains: searchTerm, mode: "insensitive" } },
                                { metaTitle: { contains: searchTerm, mode: "insensitive" } },
                                { metaDescription: { contains: searchTerm, mode: "insensitive" } },
                            ],
                        },
                    },
                },
                {
                    subCategory: {
                        category: {
                            translations: {
                                some: {
                                    locale: locale,
                                    OR: [
                                        { name: { contains: searchTerm, mode: "insensitive" } },
                                        { description: { contains: searchTerm, mode: "insensitive" } },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    subCategory: {
                        translations: {
                            some: {
                                locale: locale,
                                OR: [
                                    { name: { contains: searchTerm, mode: "insensitive" } },
                                    { description: { contains: searchTerm, mode: "insensitive" } },
                                ],
                            },
                        },
                    },
                },
                {
                    voltage: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    brandOfLed: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    luminousFlux: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    mainMaterial: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    cri: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    productDimensions: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    holeSize: { contains: searchTerm, mode: "insensitive" },
                },
                {
                    powerFactor: { contains: searchTerm, mode: "insensitive" },
                },
            ],
        },
        include: {
            translations: {
                where: { locale: locale },
            },
            subCategory: {
                include: {
                    translations: {
                        where: { locale: locale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: locale },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [
            { isFeatured: "desc" },
            { order: "asc" },
        ],
        take: 20, // Increased from 10 to show more results
    })

    // Remove duplicates (in case a product matches multiple criteria)
    const uniqueProducts = Array.from(
        new Map(products.map(p => [p.id, p])).values()
    )

    return uniqueProducts.map(product => {
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
            maxWattage: product.maxWattage,
            voltage: product.voltage,
            colorTemperatures: product.colorTemperatures,
            ipRating: product.ipRating,
        }
    })
}

// Optional: Add a separate function for advanced filtering
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
}) {
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
        locale = "en",
    } = filters

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            AND: [
                // Category filter
                categorySlug
                    ? {
                        subCategory: {
                            category: {
                                slug: categorySlug,
                            },
                        },
                    }
                    : {},
                // SubCategory filter
                subCategorySlug
                    ? {
                        subCategory: {
                            slug: subCategorySlug,
                        },
                    }
                    : {},
                // Wattage range filter
                minWattage || maxWattage
                    ? {
                        maxWattage: {
                            ...(minWattage ? { gte: minWattage } : {}),
                            ...(maxWattage ? { lte: maxWattage } : {}),
                        },
                    }
                    : {},
                // Price range filter
                minPrice || maxPrice
                    ? {
                        price: {
                            ...(minPrice ? { gte: minPrice } : {}),
                            ...(maxPrice ? { lte: maxPrice } : {}),
                        },
                    }
                    : {},
                // Text search
                searchTerm
                    ? {
                        OR: [
                            {
                                translations: {
                                    some: {
                                        locale: locale,
                                        OR: [
                                            { name: { contains: searchTerm, mode: "insensitive" } },
                                            { description: { contains: searchTerm, mode: "insensitive" } },
                                        ],
                                    },
                                },
                            },
                            {
                                productId: { contains: searchTerm, mode: "insensitive" },
                            },
                        ],
                    }
                    : {},
            ],
        },
        include: {
            translations: {
                where: { locale: locale },
            },
            subCategory: {
                include: {
                    translations: {
                        where: { locale: locale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale: locale },
                            },
                        },
                    },
                },
            },
        },
        orderBy: [
            { isFeatured: "desc" },
            { order: "asc" },
        ],
        take: 50,
    })

    return products.map(product => {
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
            maxWattage: product.maxWattage,
            voltage: product.voltage,
            colorTemperatures: product.colorTemperatures,
            ipRating: product.ipRating,
        }
    })
}