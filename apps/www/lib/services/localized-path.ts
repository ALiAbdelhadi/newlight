import { decodeSlug, encodeSlug, type Locale } from "@repo/database"

import { CategoryService } from "@/lib/services/category-service"
import { alternateCategorySlug, alternateSubCategorySlug } from "@/lib/services/taxonomy"

const LOCALES: readonly Locale[] = ["en", "ar"]

function isLocale(value: string | undefined): value is Locale {
    return LOCALES.includes(value as Locale)
}

/**
 * Translates a path into its equivalent under `targetLocale`.
 *
 * Most pages keep the same path in every language — /about is /about whether you got
 * there via /en or /ar. Category and sub-category pages are the exception: each carries
 * its own per-locale slug (an Arabic category is not reachable at its English slug), so a
 * plain locale-prefix swap produces a URL that 404s. The product slug in the fourth
 * segment is locale-invariant and passes through unchanged.
 *
 * Shared by the language switcher (actions/locale.ts) and by the category/sub-category/
 * product pages' hreflang alternates in generateMetadata — one resolver, so the two never
 * disagree about what the "same page in the other language" is.
 */
export async function localizedPathFor(pathname: string, targetLocale: Locale): Promise<string> {
    const segments = pathname.split("/").filter(Boolean)
    const currentLocale = isLocale(segments[0]) ? segments[0] : undefined
    const rest = currentLocale ? segments.slice(1) : segments

    if (rest[0] !== "category" || rest.length < 2) {
        return `/${targetLocale}${rest.length ? `/${rest.join("/")}` : ""}`
    }

    const fallback = `/${targetLocale}/category`
    const [, categorySegment, subCategorySegment, productSegment] = rest

    try {
        const category = await CategoryService.getCategoryBySlug(
            currentLocale ?? targetLocale,
            decodeSlug(categorySegment)
        )
        if (!category) return fallback

        const categorySlug = (await alternateCategorySlug(category.id, targetLocale)) ?? category.translations[0]?.slug
        if (!categorySlug) return fallback
        if (!subCategorySegment) return `${fallback}/${encodeSlug(categorySlug)}`

        const subCategory = category.subCategories.find(
            (sub) => sub.translations[0]?.slug === decodeSlug(subCategorySegment)
        )
        if (!subCategory) return `${fallback}/${encodeSlug(categorySlug)}`

        const subCategorySlug =
            (await alternateSubCategorySlug(subCategory.id, targetLocale)) ?? subCategory.translations[0]?.slug
        if (!subCategorySlug) return `${fallback}/${encodeSlug(categorySlug)}`

        const tail = [encodeSlug(categorySlug), encodeSlug(subCategorySlug)]
        if (productSegment) tail.push(encodeSlug(decodeSlug(productSegment)))

        return `${fallback}/${tail.join("/")}`
    } catch {
        return fallback
    }
}
