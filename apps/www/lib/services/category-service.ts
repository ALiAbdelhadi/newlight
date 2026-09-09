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

        // Resolved against the live discount set, once for the whole listing (§13.2). A tile
        // that renders `products.price` while a sale is running lies about what the checkout
        // will charge.
        const discounts = await activeDiscounts()
        return {
            ...resolved.value,
            products: this.sortForLocale(products, locale).map((product) => toCardView(product, discounts)),
        }
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

        /*
         * The listing include, not the plain card one: it adds the three attributes the filter
         * bar narrows by — colour temperatures, available finishes, and the stock level at the
         * main location. All three are real columns; see `product-facets.ts` for what was left
         * out and why.
         */
        const products = await prisma.product.findMany({
            where: { subCategoryId: resolved.value.id, ...liveProduct },
            orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { order: "asc" }],
            include: productListCardInclude(locale),
        })

        const discounts = await activeDiscounts()
        const rows = products.map((product) => toCardView(product, discounts))

        /*
         * Group before deduplicating, so a family's card can carry the union of its variants'
         * attributes. The representative is still the first row in the operator's order; what
         * changes is that filtering for 4000K now finds a family whose 30W variant offers it,
         * which is the answer the product page will give when the customer clicks through.
         */
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

        /*
         * Finish names come from `ProductColor`, which the admin's Reference data screen owns,
         * and they are localised there — nameEn / nameAr are columns, not a lookup table in
         * this app.
         */
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

        /*
         * WHICH specs this sub-category asks for is the operator's answer, not a guess:
         * `SubCategorySpec` is the join the admin's Categories screen maintains, and its
         * `order` is the order the controls appear in. Which of those are worth a control is
         * then decided from the values actually present — see `buildSpecFacets`.
         */
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

        /*
         * `listing` and `facets` ONLY. The raw rows are deliberately not returned.
         *
         * They were, and it was an ADR 0001 violation that the browser reported 441 times on a
         * single page load: `ProductSpec.valueNumber` is a `Prisma.Decimal`, the listing page is
         * a Client Component, and React cannot serialise a Decimal across that boundary. Adding
         * specs to the listing query for the filter facets is what pulled them in — `toCardView`
         * strips `price` and `averageCost` from the top level and knows nothing about a nested
         * relation.
         *
         * `listing` is already flat, plain and locale-resolved, and nothing on the page reads
         * anything else — so the fix is to stop sending what nobody asked for, rather than to
         * serialise it. It also drops every image array, translation row and stock level from
         * the payload.
         */
        // `definitions` rides along because the TILE needs the same labels the filter panel
        // uses (see `quickSpecs`) — it is four fields of plain text per spec, already built.
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
