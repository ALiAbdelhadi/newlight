import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import { encodeSlug, resolveLocale, type Locale } from "@repo/database"
import { CategoryService } from "@/lib/services/category-service"
import { constructMetadata } from "@/lib/metadata"
import { allTaxonomyPaths } from "@/lib/services/taxonomy"
import SubCategoryPage from "./sub-category-page"

export const revalidate = 7200

type Props = { params: Promise<{ category: string; subCategory: string; locale: string }> }

async function load(params: Props["params"]) {
    const { category, subCategory } = await params
    const locale = resolveLocale(await getLocale())
    const categorySlug = decodeURIComponent(category)
    const subCategorySlug = decodeURIComponent(subCategory)

    const resolution = await CategoryService.resolveSubCategory(locale, categorySlug, subCategorySlug)
    if (resolution.kind === "moved") {
        const [nextCategory, nextSub] = resolution.to.split("/")
        permanentRedirect(`/${locale}/category/${encodeSlug(nextCategory!)}/${encodeSlug(nextSub!)}`)
    }
    if (resolution.kind === "missing") notFound()

    // One card per family, not per SKU: five wattages of one fixture are one product to a
    // reader, and v1 listed them as five (§6).
    const view = await CategoryService.getProductsWithUniqueVariants(locale, categorySlug, subCategorySlug)
    if (!view) notFound()
    return { view, locale, categorySlug }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { view, locale } = await load(params)
    const t = await getTranslations("metadatas.section-type-page")
    const translation = view.translations[0]
    const name = translation?.name ?? ""
    // The message takes {section} and {category}; passing the wrong parameter names renders
    // the raw key, which is what the page was doing before this was checked in a browser.
    const categoryName = view.category.translations[0]?.name ?? ""

    return constructMetadata({
        title: t("title", { section: name, category: categoryName }),
        description: translation?.description || t("description", { section: name, category: categoryName }),
        locale,
        image: view.imageUrl ?? undefined,
    })
}

export async function generateStaticParams() {
    const locales: Locale[] = ["en", "ar"]
    const params = await Promise.all(
        locales.map(async (locale) => {
            const { subCategories } = await allTaxonomyPaths(locale)
            return subCategories.flatMap((row) => {
                const categorySlug = row.subCategory.category.translations[0]?.slug
                return categorySlug ? [{ locale, category: categorySlug, subCategory: row.slug }] : []
            })
        })
    )
    return params.flat()
}

export default async function Page({ params }: Props) {
    const { view, categorySlug } = await load(params)
    return <SubCategoryPage subCategory={view} categorySlug={categorySlug} />
}
