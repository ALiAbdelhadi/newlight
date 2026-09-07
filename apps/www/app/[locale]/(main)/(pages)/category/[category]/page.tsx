import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import { encodeSlug, resolveLocale, type Locale } from "@repo/database"
import { CategoryService } from "@/lib/services/category-service"
import { constructMetadata } from "@/lib/metadata"
import { allTaxonomyPaths } from "@/lib/services/taxonomy"
import CategoryPage from "./category-page"

export const revalidate = 7200

type Props = { params: Promise<{ category: string; locale: string }> }

/**
 * The param is `[category]` now, not `[subCategory]`.
 *
 * v1's segment names were actively misleading: `[subCategory]` held the CATEGORY slug and
 * `[sectionType]` held the sub-category. Anyone reading a page here had to know that, and the
 * files are being rewritten for per-locale slugs anyway (§9.2), so the names are corrected
 * with them.
 */
async function load(params: Props["params"]) {
    const { category: slug } = await params
    const locale = resolveLocale(await getLocale())
    const resolution = await CategoryService.resolveCategory(locale, decodeURIComponent(slug))

    if (resolution.kind === "moved") {
        // A retired slug answers with a 301 rather than a 404 (§10). Without
        // TaxonomySlugHistory, renaming a category in the admin panel silently broke every
        // inbound link and every indexed page.
        permanentRedirect(`/${locale}/category/${encodeSlug(resolution.to)}`)
    }
    if (resolution.kind === "missing") notFound()

    const category = await CategoryService.getCategoryBySlug(locale, resolution.value.translations[0]!.slug)
    if (!category) notFound()
    return { category, locale }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category, locale } = await load(params)
    const t = await getTranslations("metadatas.sub-category-page")
    const translation = category.translations[0]
    const name = translation?.name ?? ""

    return constructMetadata({
        title: t("title", { category: name }),
        description: translation?.description || t("description", { category: name }),
        locale,
        image: category.imageUrl ?? category.subCategories[0]?.imageUrl ?? undefined,
        keywords: category.subCategories
            .slice(0, 8)
            .map((sub) => sub.translations[0]?.name)
            .filter(Boolean)
            .join(", "),
    })
}

export async function generateStaticParams() {
    // Generated from the data rather than from a hardcoded ["indoor", "outdoor"], which was
    // wrong in Arabic the moment slugs became per-locale.
    const locales: Locale[] = ["en", "ar"]
    const params = await Promise.all(
        locales.map(async (locale) => {
            const { categories } = await allTaxonomyPaths(locale)
            return categories.map((row) => ({ locale, category: row.slug }))
        })
    )
    return params.flat()
}

export default async function Page({ params }: Props) {
    const { category } = await load(params)
    return <CategoryPage category={category} />
}
