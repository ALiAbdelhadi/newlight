import { prisma, translationsFor, type Locale } from "@repo/database"
import { liveProduct, liveSubCategory, productCardInclude, toCardView, type ProductCard } from "./selectors"
import { resolveCategory, resolveSubCategory } from "./taxonomy"

/**
 * Taxonomy reads for the storefront.
 *
 * Rewritten for v2. Three things changed and all three were defects in v1:
 *
 *   1. Slugs are per-locale (§9.2), so every lookup takes a locale. `getCategoryByType` is
 *      gone with the CategoryType enum — a category is an ordinary row addressed by its slug.
 *   2. Nothing is cast. v1 ended every method with `as unknown as Category`, which meant the
 *      compiler could not tell the caller that `specifications` had been deleted from the
 *      schema. The return types are Prisma payloads derived from the queries themselves.
 *   3. Product cards read ProductImage and the family, not `images[]` and `baseProductId`.
 */

export type CategoryWithSubCategories = NonNullable<Awaited<ReturnType<typeof CategoryService.getCategoryBySlug>>>
export type SubCategoryWithProducts = NonNullable<Awaited<ReturnType<typeof CategoryService.getSubCategoryWithProducts>>>

/** Flat projection the footer renders. `categoryType` is gone; the parent slug replaces it. */
export type FooterSubCategory = {
    id: string
    slug: string
    name: string
    categorySlug: string
    categoryName: string
}

export class CategoryService {
    /**
     * Alphabetical within the ordering the admin chose: featured first, then `order`, then the
     * name in the reader's own language — `localeCompare` with "ar" sorts Arabic properly,
     * which a byte comparison does not.
     */
    private static sortForLocale<T extends { order?: number; isFeatured?: boolean; translations: Array<{ name: string }> }>(
        items: T[],
        locale: Locale
    ): T[] {
        return [...items].sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
            if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order
            const nameA = a.translations[0]?.name ?? ""
            const nameB = b.translations[0]?.name ?? ""
            return nameA.localeCompare(nameB, locale, { numeric: true, sensitivity: "base" })
        })
    }

    /** Resolves through TaxonomySlugHistory, so a retired slug reports where it moved to. */
    static async resolveCategory(locale: Locale, slug: string) {
        return resolveCategory(locale, slug)
    }

    static async resolveSubCategory(locale: Locale, categorySlug: string, subCategorySlug: string) {
        return resolveSubCategory(locale, categorySlug, subCategorySlug)
    }

    static async getCategoryBySlug(locale: Locale, slug: string) {
        const translation = await prisma.categoryTranslation.findUnique({
            where: { locale_slug: { locale, slug } },
            include: {
                category: {
                    include: {
                        translations: translationsFor(locale),
                        subCategories: {
                            where: liveSubCategory,
                            orderBy: { order: "asc" },
                            include: {
                                translations: translationsFor(locale),
                                _count: { select: { products: { where: liveProduct } } },
                            },
                        },
                    },
                },
            },
        })

        if (!translation || !translation.category.isActive || translation.category.deletedAt) return null

        const category = translation.category
        return { ...category, subCategories: this.sortForLocale(category.subCategories, locale) }
    }

    static async getAllCategories(locale: Locale) {
        const categories = await prisma.category.findMany({
            where: { isActive: true, deletedAt: null },
            orderBy: { order: "asc" },
            include: {
                translations: translationsFor(locale),
                subCategories: {
                    where: liveSubCategory,
                    orderBy: { order: "asc" },
                    include: {
                        translations: translationsFor(locale),
                        _count: { select: { products: { where: liveProduct } } },
                    },
                },
            },
        })
        return categories.map((category) => ({
            ...category,
            subCategories: this.sortForLocale(category.subCategories, locale),
        }))
    }

    static async getSubCategoryWithProducts(locale: Locale, categorySlug: string, subCategorySlug: string) {
        const resolved = await resolveSubCategory(locale, categorySlug, subCategorySlug)
        if (resolved.kind !== "found") return null

        const products = await prisma.product.findMany({
            where: { subCategoryId: resolved.value.id, ...liveProduct },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
            include: productCardInclude(locale),
        })

        return { ...resolved.value, products: this.sortForLocale(products, locale).map(toCardView) }
    }

    /**
     * One card per FAMILY, not per SKU.
     *
     * A listing that showed every variant rendered `nl-a603-6w` through `nl-a603-30w` as five
     * separate products of the same fixture. v1 deduplicated by `baseProductId`, a SKU string
     * with no foreign key behind it; v2 groups by `familyId`, which is a real relation the
     * transform populated from that same verified data. Products with no family — the 41
     * singletons — are kept as themselves.
     */
    static async getProductsWithUniqueVariants(locale: Locale, categorySlug: string, subCategorySlug: string) {
        const resolved = await resolveSubCategory(locale, categorySlug, subCategorySlug)
        if (resolved.kind !== "found") return null

        const products = await prisma.product.findMany({
            where: { subCategoryId: resolved.value.id, ...liveProduct },
            orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { order: "asc" }],
            include: productCardInclude(locale),
        })

        const seen = new Set<string>()
        const representatives: ProductCard[] = []
        for (const product of products) {
            const key = product.familyId ?? product.id
            if (seen.has(key)) continue
            seen.add(key)
            representatives.push(product)
        }

        return { ...resolved.value, products: this.sortForLocale(representatives, locale).map(toCardView) }
    }

    static async getSubCategories(locale: Locale, categorySlug: string) {
        const category = await prisma.categoryTranslation.findUnique({
            where: { locale_slug: { locale, slug: categorySlug } },
            select: { categoryId: true },
        })
        if (!category) return []

        const subCategories = await prisma.subCategory.findMany({
            where: { categoryId: category.categoryId, ...liveSubCategory },
            orderBy: { order: "asc" },
            include: {
                translations: translationsFor(locale),
                _count: { select: { products: { where: liveProduct } } },
            },
        })
        return this.sortForLocale(subCategories, locale)
    }

    static async getFooterSubCategories(locale: Locale): Promise<FooterSubCategory[]> {
        const subCategories = await prisma.subCategory.findMany({
            where: liveSubCategory,
            orderBy: { order: "asc" },
            include: {
                translations: translationsFor(locale),
                category: { include: { translations: translationsFor(locale) } },
            },
        })

        return subCategories.flatMap((subCategory) => {
            const translation = subCategory.translations[0]
            const categoryTranslation = subCategory.category.translations[0]
            // A row with no translation in this locale is a data defect, not something to
            // paper over with the slug as a display name (§14.2). Skip it and say so.
            if (!translation || !categoryTranslation) {
                console.warn(`[footer] sub-category ${subCategory.id} has no ${locale} translation; omitted`)
                return []
            }
            return [{
                id: subCategory.id,
                slug: translation.slug,
                name: translation.name,
                categorySlug: categoryTranslation.slug,
                categoryName: categoryTranslation.name,
            }]
        })
    }
}
