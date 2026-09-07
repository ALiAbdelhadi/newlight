import type { MetadataRoute } from "next"
import { prisma, LOCALES, type Locale } from "@repo/database"
import { liveProduct } from "@/lib/services/selectors"
import { allTaxonomyPaths } from "@/lib/services/taxonomy"

/**
 * The sitemap. There was none.
 *
 * Both locales, with `alternates.languages` on every entry, because a bilingual site that
 * lists only one language is telling search engines the other does not exist. The Arabic
 * slugs are percent-encoded by `URL`, which is the boundary §14.6 asks them to be encoded at.
 */
export const revalidate = 86400

function url(base: string, locale: Locale, path: string): string {
    return new URL(`/${locale}${path}`, base).toString()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://newlight-eg.com"
    const entries: MetadataRoute.Sitemap = []

    // Every one of these is fetched and answers 200. `/about-us` was listed here and does not
    // exist — the route is `/about` — so the sitemap submitted a 404 to every crawler that
    // read it. A sitemap is a promise about what resolves, and nothing was checking it.
    //
    // `/catalog` and `/faqs` are deliberately absent: they are placeholder routes that render
    // one word each, and listing an empty page is worse than not listing it.
    const staticPaths = ["", "/category", "/about", "/contact", "/privacy", "/technical-resources", "/new-collection"]
    for (const path of staticPaths) {
        entries.push({
            url: url(base, "en", path),
            changeFrequency: "monthly",
            priority: path === "" ? 1 : 0.6,
            alternates: {
                languages: Object.fromEntries(LOCALES.map((locale) => [locale, url(base, locale, path)])),
            },
        })
    }

    // Taxonomy, per locale — the slugs differ between languages, so this cannot be one list
    // with a locale prefix bolted on.
    const byLocale = await Promise.all(
        LOCALES.map(async (locale) => ({ locale, ...(await allTaxonomyPaths(locale)) }))
    )

    for (const { locale, categories, subCategories } of byLocale) {
        for (const category of categories) {
            entries.push({
                url: url(base, locale, `/category/${category.slug}`),
                lastModified: category.updatedAt,
                changeFrequency: "weekly",
                priority: 0.8,
            })
        }
        for (const subCategory of subCategories) {
            const categorySlug = subCategory.subCategory.category.translations[0]?.slug
            if (!categorySlug) continue
            entries.push({
                url: url(base, locale, `/category/${categorySlug}/${subCategory.slug}`),
                lastModified: subCategory.updatedAt,
                changeFrequency: "weekly",
                priority: 0.8,
            })
        }
    }

    // Products keep ONE slug across locales (§9.3), so each product is listed once per locale
    // under the taxonomy path for that locale, and the two are alternates of each other.
    const products = await prisma.product.findMany({
        where: liveProduct,
        select: {
            slug: true,
            updatedAt: true,
            subCategory: {
                select: {
                    translations: { select: { locale: true, slug: true } },
                    category: { select: { translations: { select: { locale: true, slug: true } } } },
                },
            },
        },
    })

    for (const product of products) {
        const paths = LOCALES.flatMap((locale) => {
            const sub = product.subCategory.translations.find((t) => t.locale === locale)
            const category = product.subCategory.category.translations.find((t) => t.locale === locale)
            if (!sub || !category) return []
            return [[locale, `/category/${category.slug}/${sub.slug}/${product.slug}`] as const]
        })
        const languages = Object.fromEntries(paths.map(([locale, path]) => [locale, url(base, locale, path)]))

        for (const [locale, path] of paths) {
            entries.push({
                url: url(base, locale, path),
                lastModified: product.updatedAt,
                changeFrequency: "weekly",
                priority: 0.7,
                alternates: { languages },
            })
        }
    }

    return entries
}
