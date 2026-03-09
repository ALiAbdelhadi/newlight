import { prisma } from "@repo/database"

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

export class SearchService {
    static async searchContent(query: string, locale?: string, limit: number = 20): Promise<SearchResult> {
        const searchLocale = "en"
        const searchTerm = query.trim()

        if (!searchTerm) {
            return { products: [], categories: [], subCategories: [] }
        }

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { productId: { contains: searchTerm, mode: "insensitive" } },
                    { slug: { contains: searchTerm, mode: "insensitive" } },
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
                translations: { where: { locale: searchLocale } },
                subCategory: {
                    include: {
                        translations: { where: { locale: searchLocale } },
                        category: {
                            include: {
                                translations: { where: { locale: searchLocale } },
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
                    { slug: { contains: searchTerm, mode: "insensitive" } },
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
                translations: { where: { locale: searchLocale } },
            },
            orderBy: { order: "asc" },
            take: limit,
        })

        const subCategories = await prisma.subCategory.findMany({
            where: {
                isActive: true,
                OR: [
                    { slug: { contains: searchTerm, mode: "insensitive" } },
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
                translations: { where: { locale: searchLocale } },
                category: {
                    include: {
                        translations: { where: { locale: searchLocale } },
                    },
                },
            },
            orderBy: { order: "asc" },
            take: limit,
        })

        return {
            products: products.map(product => {
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
            }),
            categories: categories.map(category => {
                const translation = category.translations[0]
                return {
                    id: category.id,
                    slug: category.slug,
                    name: translation?.name || "",
                    description: translation?.description || null,
                }
            }),
            subCategories: subCategories.map(subCategory => {
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
            }),
        }
    }
}
