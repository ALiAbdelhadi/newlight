import { prisma, translationsFor, type Locale } from "@repo/database"
import { liveCategory, liveProduct, liveSubCategory } from "./selectors"

export type Resolution<T> =
    | { kind: "found"; value: T }
    | { kind: "moved"; to: string }
    | { kind: "missing" }

export async function resolveCategory(locale: Locale, slug: string) {
    const translation = await prisma.categoryTranslation.findUnique({
        where: { locale_slug: { locale, slug } },
        include: { category: { include: { translations: translationsFor(locale) } } },
    })

    if (translation && translation.category.isActive && !translation.category.deletedAt) {
        return { kind: "found", value: translation.category } as const
    }

    const history = await prisma.taxonomySlugHistory.findUnique({
        where: { locale_slug: { locale, slug } },
    })
    if (history?.entityType === "CATEGORY") {
        const current = await prisma.categoryTranslation.findUnique({
            where: { categoryId_locale: { categoryId: history.entityId, locale } },
            select: { slug: true },
        })
        if (current) return { kind: "moved", to: current.slug } as const
    }
    return { kind: "missing" } as const
}

export async function resolveSubCategory(locale: Locale, categorySlug: string, subCategorySlug: string) {
    const translation = await prisma.subCategoryTranslation.findUnique({
        where: { locale_slug: { locale, slug: subCategorySlug } },
        include: {
            subCategory: {
                include: {
                    translations: translationsFor(locale),
                    category: { include: { translations: translationsFor(locale) } },
                },
            },
        },
    })

    if (translation) {
        const subCategory = translation.subCategory
        const parentSlug = subCategory.category.translations[0]?.slug
        if (subCategory.isActive && !subCategory.deletedAt && parentSlug === categorySlug) {
            return { kind: "found", value: subCategory } as const
        }
        if (parentSlug && parentSlug !== categorySlug) {
            return { kind: "moved", to: `${parentSlug}/${subCategorySlug}` } as const
        }
    }

    const history = await prisma.taxonomySlugHistory.findUnique({
        where: { locale_slug: { locale, slug: subCategorySlug } },
    })
    if (history?.entityType === "SUB_CATEGORY") {
        const current = await prisma.subCategoryTranslation.findUnique({
            where: { subCategoryId_locale: { subCategoryId: history.entityId, locale } },
            include: { subCategory: { include: { category: { include: { translations: translationsFor(locale) } } } } },
        })
        if (current) {
            const parentSlug = current.subCategory.category.translations[0]?.slug ?? categorySlug
            return { kind: "moved", to: `${parentSlug}/${current.slug}` } as const
        }
    }
    return { kind: "missing" } as const
}

export async function resolveProductSlug(slug: string): Promise<Resolution<string>> {
    const product = await prisma.product.findFirst({
        where: { slug, ...liveProduct },
        select: { id: true },
    })
    if (product) return { kind: "found", value: product.id }

    const history = await prisma.productSlugHistory.findUnique({
        where: { slug },
        include: { product: { select: { slug: true, isActive: true, deletedAt: true } } },
    })
    if (history?.product && history.product.isActive && !history.product.deletedAt) {
        return { kind: "moved", to: history.product.slug }
    }
    return { kind: "missing" }
}

export async function alternateCategorySlug(categoryId: string, locale: Locale): Promise<string | null> {
    const row = await prisma.categoryTranslation.findUnique({
        where: { categoryId_locale: { categoryId, locale } },
        select: { slug: true },
    })
    return row?.slug ?? null
}

export async function alternateSubCategorySlug(subCategoryId: string, locale: Locale): Promise<string | null> {
    const row = await prisma.subCategoryTranslation.findUnique({
        where: { subCategoryId_locale: { subCategoryId, locale } },
        select: { slug: true },
    })
    return row?.slug ?? null
}

export async function allTaxonomyPaths(locale: Locale) {
    const [categories, subCategories] = await Promise.all([
        prisma.categoryTranslation.findMany({
            where: { locale, category: liveCategory },
            select: { slug: true, categoryId: true, updatedAt: true },
        }),
        prisma.subCategoryTranslation.findMany({
            where: { locale, subCategory: liveSubCategory },
            select: {
                slug: true,
                updatedAt: true,
                subCategory: { select: { category: { select: { translations: { where: { locale }, select: { slug: true } } } } } },
            },
        }),
    ])
    return { categories, subCategories }
}
