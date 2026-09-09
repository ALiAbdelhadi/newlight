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

    // categoryId/subCategoryId are stable across locales; a slug is not — this indexes every
    // locale's slug by that id so each entry's sitemap-level hreflang (`alternates.languages`)
    // can point at the same entity's actual URL in the other language, the same rule the page
    // metadata's hreflang follows (see alternateCategorySlug/alternateSubCategorySlug).
    const categorySlugById = new Map<string, Partial<Record<Locale, string>>>()
    const subCategorySlugById = new Map<string, Partial<Record<Locale, string>>>()
    for (const { locale, categories, subCategories } of byLocale) {
        for (const category of categories) {
            const byLocaleSlug = categorySlugById.get(category.categoryId) ?? {}
            byLocaleSlug[locale] = category.slug
            categorySlugById.set(category.categoryId, byLocaleSlug)
        }
        for (const subCategory of subCategories) {
            const byLocaleSlug = subCategorySlugById.get(subCategory.subCategoryId) ?? {}
            byLocaleSlug[locale] = subCategory.slug
            subCategorySlugById.set(subCategory.subCategoryId, byLocaleSlug)
        }
    }

    for (const { locale, categories, subCategories } of byLocale) {
        for (const category of categories) {
            const languages = categorySlugById.get(category.categoryId)
            entries.push({
                url: url(base, locale, `/category/${category.slug}`),
                lastModified: category.updatedAt,
                changeFrequency: "weekly",
                priority: 0.8,
                ...(languages
                    ? { alternates: { languages: Object.fromEntries(
                          Object.entries(languages).map(([lng, slug]) => [lng, url(base, lng as Locale, `/category/${slug}`)])
                      ) } }
                    : {}),
            })
        }
        for (const subCategory of subCategories) {
            const categorySlug = subCategory.subCategory.category.translations[0]?.slug
            if (!categorySlug) continue
            const languages = subCategorySlugById.get(subCategory.subCategoryId)
            const categoryLanguages = categorySlugById.get(
                categories.find((c) => c.slug === categorySlug)?.categoryId ?? ""
            )
            entries.push({
                url: url(base, locale, `/category/${categorySlug}/${subCategory.slug}`),
                lastModified: subCategory.updatedAt,
                changeFrequency: "weekly",
                priority: 0.8,
                ...(languages && categoryLanguages
                    ? {
                          alternates: {
                              languages: Object.fromEntries(
                                  Object.entries(languages).flatMap(([lng, subSlug]) => {
                                      const catSlug = categoryLanguages[lng as Locale]
                                      return catSlug ? [[lng, url(base, lng as Locale, `/category/${catSlug}/${subSlug}`)]] : []
                                  })
                              ),
                          },
                      }
                    : {}),
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
