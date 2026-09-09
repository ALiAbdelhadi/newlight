import type { MetadataRoute } from "next"
import { prisma, LOCALES, type Locale } from "@repo/database"
import { liveProduct } from "@/lib/services/selectors"
import { allTaxonomyPaths } from "@/lib/services/taxonomy"

export const revalidate = 86400

function url(base: string, locale: Locale, path: string): string {
    return new URL(`/${locale}${path}`, base).toString()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://newlight-eg.com"
    const entries: MetadataRoute.Sitemap = []

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
