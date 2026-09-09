import type { Metadata } from "next"
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/lib/structured-data"
import { ProductStrip } from "@/components/product-strip"
import { categoryHighlights, categoryOffers } from "@/lib/services/merchandising-service"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import { encodeSlug, resolveLocale, type Locale } from "@repo/database"
import { CategoryService } from "@/lib/services/category-service"
import { offersForSection } from "@/lib/services/offers-service"
import { OfferBanner } from "@/components/offer-banner"
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

    // Anything discounted anywhere under this category (§13.2). Null the rest of the time.
    const offer = await offersForSection({ categoryId: category.id })
    return { category, locale, offer }
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
    const { category, offer, locale } = await load(params)
    const translation = category.translations[0]
    const name = translation?.name ?? ""
    const slug = translation?.slug ?? ""
    const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB")

    const [t, highlights, offers] = await Promise.all([
        getTranslations("merchandising"),
        categoryHighlights(category.id, locale),
        offer ? categoryOffers(locale, slug) : Promise.resolve(null),
    ])

    /*
     * A category landing that is only a list of its sections makes the customer choose before
     * showing them anything. Under the grid: what is on offer here (while something is), then
     * the category's featured and newest products — both derived, both absent when empty.
     */
    const categoryPath = `/${locale}/category/${encodeSlug(slug)}`

    return (
        <>
            <JsonLd
                data={[
                    breadcrumbSchema([{ name, path: categoryPath }]),
                    itemListSchema(
                        category.subCategories.flatMap((subCategory) => {
                            const sub = subCategory.translations[0]
                            return sub ? [{ name: sub.name, path: `${categoryPath}/${encodeSlug(sub.slug)}` }] : []
                        }),
                        name
                    ),
                ]}
            />
            {offer && <OfferBanner {...offer} section={name} />}
            <CategoryPage category={category} />
            {offers && (
                <ProductStrip
                    cards={offers.cards}
                    eyebrow={t("offersIn.eyebrow")}
                    title={t("offersIn.title", { percent: number.format(offers.percentOff), category: name })}
                    href="/offers"
                    hrefLabel={t("offersIn.link")}
                    tone="sunk"
                />
            )}
            <ProductStrip
                cards={highlights}
                eyebrow={t("popularIn.eyebrow")}
                title={t("popularIn.title", { category: name })}
                description={t("popularIn.description")}
                className="border-t"
            />
        </>
    )
}
