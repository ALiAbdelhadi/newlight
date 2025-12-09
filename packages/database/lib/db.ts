import { prisma } from "../client"

export async function getCategoryBySlug(slug: string, locale = "en") {
    const category = await prisma.category.findUnique({
        where: { slug },
        include: {
            translations: {
                where: { locale },
            },
            subCategories: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                include: {
                    translations: {
                        where: { locale },
                    },
                },
            },
        },
    })

    return category
}

export async function getCategoryByType(categoryType: "indoor" | "outdoor", locale = "en") {
    const category = await prisma.category.findFirst({
        where: {
            categoryType,
            isActive: true,
        },
        include: {
            translations: {
                where: { locale },
            },
            subCategories: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                include: {
                    translations: {
                        where: { locale },
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

export async function getSubCategoryBySlug(categorySlug: string, subCategorySlug: string, locale = "en") {
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
                where: { locale },
            },
            category: {
                include: {
                    translations: {
                        where: { locale },
                    },
                },
            },
            products: {
                where: { isActive: true },
                orderBy: { order: "asc" },
                include: {
                    translations: {
                        where: { locale },
                    },
                },
            },
        },
    })

    return subCategory
}

export async function getSubCategories(categorySlug: string, locale = "en") {
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
                where: { locale },
            },
            products: {
                where: { isActive: true },
                take: 1, // Get count of products
            },
        },
    })

    return subCategories
}

export async function getProductsBySubCategory(
    categorySlug: string,
    subCategorySlug: string,
    locale = "en"
) {
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
                where: { locale },
            },
            category: {
                include: {
                    translations: {
                        where: { locale },
                    },
                },
            },
            products: {
                where: { isActive: true },
                orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
                include: {
                    translations: {
                        where: { locale },
                    },
                },
            },
        },
    })

    return subCategory
}

export async function getProductById(
    productId: string,
    locale = "en"
) {
    const product = await prisma.product.findUnique({
        where: {
            productId,
            isActive: true,
        },
        include: {
            translations: {
                where: { locale },
            },
            subCategory: {
                include: {
                    translations: {
                        where: { locale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale },
                            },
                        },
                    },
                },
            },
        },
    })

    return product
}

export async function getProductBySlug(
    slug: string,
    locale = "en"
) {
    const product = await prisma.product.findUnique({
        where: {
            slug,
            isActive: true,
        },
        include: {
            translations: {
                where: { locale },
            },
            subCategory: {
                include: {
                    translations: {
                        where: { locale },
                    },
                    category: {
                        include: {
                            translations: {
                                where: { locale },
                            },
                        },
                    },
                },
            },
        },
    })

    return product
}

