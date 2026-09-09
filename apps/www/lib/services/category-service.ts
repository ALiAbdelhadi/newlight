import { prisma, translationsFor, type Locale } from "@repo/database"
import {
    liveProduct,
    liveSubCategory,
    productCardInclude,
    productListCardInclude,
    toCardView,
    type ProductCard,
} from "./selectors"
import { activeDiscounts } from "@/lib/discounts"
import {
    buildFacets,
    buildSpecFacets,
    toListingProduct,
    type ListingProduct,
    type ProductFacets,
    type SpecDefinitionView,
} from "./product-facets"
import { resolveCategory, resolveSubCategory } from "./taxonomy"

export type CategoryWithSubCategories = NonNullable<Awaited<ReturnType<typeof CategoryService.getCategoryBySlug>>>
export type SubCategoryWithProducts = NonNullable<Awaited<ReturnType<typeof CategoryService.getSubCategoryWithProducts>>>

export type FooterSubCategory = {
    id: string
    slug: string
    name: string
    categorySlug: string
    categoryName: string
}

export class CategoryService {
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

    static async resolveCategory(locale: Locale, slug: string) {
        return resolveCategory(locale, slug)
    }

    // An admin can leave a category or sub-category's own photo unset; rather than a bare
    // placeholder, the storefront borrows the photo of the first live product underneath it —
    // the one thing that is never blank for long. Falls back to null (a plain placeholder)
    // only when there truly is no product image anywhere in scope yet.
    static async firstProductImageForSubCategory(subCategoryId: string): Promise<string | null> {
        const product = await prisma.product.findFirst({
            where: { ...liveProduct, subCategoryId },
            orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { order: "asc" }],
            select: { images: { orderBy: { order: "asc" }, take: 1, select: { url: true } } },
        })
        return product?.images[0]?.url ?? null
    }

    static async firstProductImageForCategory(categoryId: string): Promise<string | null> {
        const product = await prisma.product.findFirst({
            where: { ...liveProduct, subCategory: { categoryId } },
            orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { order: "asc" }],
            select: { images: { orderBy: { order: "asc" }, take: 1, select: { url: true } } },
        })
        return product?.images[0]?.url ?? null
    }

    /** Fills in each sub-category's `imageUrl` from its own first product when the admin left it blank. */
    static async withSubCategoryImageFallback<T extends { id: string; imageUrl: string | null }>(
        subCategories: T[]
    ): Promise<T[]> {
        return Promise.all(
            subCategories.map(async (sub) => {
                if (sub.imageUrl) return sub
                const fallback = await this.firstProductImageForSubCategory(sub.id)
                return fallback ? { ...sub, imageUrl: fallback } : sub
            })
        )
    }

    /**
     * The effective image for a category tile: its own photo, then its first sub-category's
     * (which may itself already be a product-image fallback if `subCategories` was resolved
     * through `withSubCategoryImageFallback`), then a fresh lookup across every product in the
     * category.
     */
    static async resolveCategoryImage(category: {
        id: string
        imageUrl: string | null
        subCategories?: Array<{ imageUrl: string | null }>
    }): Promise<string | null> {
        if (category.imageUrl) return category.imageUrl
        const fromSubCategory = category.subCategories?.find((sub) => sub.imageUrl)?.imageUrl
        if (fromSubCategory) return fromSubCategory
        return this.firstProductImageForCategory(category.id)
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

        const discounts = await activeDiscounts()
        return {
            ...resolved.value,
            products: this.sortForLocale(products, locale).map((product) => toCardView(product, discounts)),
        }
    }

    static async getProductsWithUniqueVariants(locale: Locale, categorySlug: string, subCategorySlug: string) {
        const resolved = await resolveSubCategory(locale, categorySlug, subCategorySlug)
        if (resolved.kind !== "found") return null

        const products = await prisma.product.findMany({
            where: { subCategoryId: resolved.value.id, ...liveProduct },
            orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { order: "asc" }],
            include: productListCardInclude(locale),
        })

        const discounts = await activeDiscounts()
        const rows = products.map((product) => toCardView(product, discounts))

        const families = new Map<string, typeof rows>()
        for (const row of rows) {
            const key = row.familyId ?? row.id
            const group = families.get(key)
            if (group) group.push(row)
            else families.set(key, [row])
        }

        const representatives = [...families.values()].map((group) => group[0]!)
        const ordered = this.sortForLocale(representatives, locale)

        const listing: ListingProduct[] = ordered.map((row) =>
            toListingProduct(row, families.get(row.familyId ?? row.id) ?? [row], locale)
        )

        const colorKeys = [...new Set(listing.flatMap((product) => product.colorKeys))]
        const colorRows = colorKeys.length
            ? await prisma.productColor.findMany({
                  where: { key: { in: colorKeys } },
                  select: { key: true, hex: true, nameEn: true, nameAr: true },
              })
            : []
        const colorNames = new Map(
            colorRows.map((color) => [
                color.key,
                { name: locale === "ar" ? color.nameAr : color.nameEn, hex: color.hex },
            ])
        )

        const declaredSpecs = await prisma.subCategorySpec.findMany({
            where: { subCategoryId: resolved.value.id },
            include: { spec: true },
            orderBy: { order: "asc" },
        })
        const definitions: SpecDefinitionView[] = declaredSpecs.map((row) => ({
            key: row.specKey,
            label: locale === "ar" ? row.spec.labelAr : row.spec.labelEn,
            unit: (locale === "ar" ? row.spec.unitAr : row.spec.unitEn) || null,
            numeric: row.spec.valueType === "NUMBER",
            order: row.order,
        }))

        const facets: ProductFacets = {
            ...buildFacets(listing, colorNames, locale),
            specs: buildSpecFacets(listing, definitions, locale),
        }

        return { ...resolved.value, listing, facets, definitions }
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
