import type { Metadata } from "next"
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/lib/structured-data"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import { encodeSlug, resolveLocale, type Locale } from "@repo/database"
import { CategoryService } from "@/lib/services/category-service"
import { offersForSection } from "@/lib/services/offers-service"
import { OfferBanner } from "@/components/offer-banner"
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

    // What is on offer IN THIS SECTION (§13.2). Null while nothing is discounted, which is what
    // makes the banner remove itself when the window closes rather than needing to be taken down.
    const [offer, siblings] = await Promise.all([
        offersForSection({ subCategoryId: view.id }),
        CategoryService.getSubCategories(locale, categorySlug),
    ])
    return { view, locale, categorySlug, offer, siblings }
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
    const { view, locale, categorySlug, offer, siblings } = await load(params)

    // The other sections of this category, for the chip row under the title — a shopper who
    // opened "Bollards" and wants "Spike lights" should not have to go up a level to find it.
    const alsoIn = siblings
        .filter((sibling) => sibling.id !== view.id)
        .flatMap((sibling) => {
            const translation = sibling.translations[0]
            return translation ? [{ id: sibling.id, name: translation.name, slug: translation.slug }] : []
        })

    /*
     * The banner is rendered HERE rather than inside the listing component, and that is a
     * placement decision as well as a code one: a band directly under the site header reads as
     * a statement about the whole section, which is what it is. Inside the grid it would read
     * as one more tile.
     */
    const sectionName = view.translations[0]?.name ?? ""
    const categoryPath = `/${locale}/category/${encodeSlug(categorySlug)}`
    const sectionPath = `${categoryPath}/${encodeSlug(view.translations[0]?.slug ?? "")}`

    return (
        <>
            {/*
             * Names and links only. A full `Product` per tile would repeat, on every listing,
             * the block the product page owns — and every repetition is a place the price can
             * go stale.
             */}
            <JsonLd
                data={[
                    breadcrumbSchema([
                        { name: view.category.translations[0]?.name ?? categorySlug, path: categoryPath },
                        { name: sectionName, path: sectionPath },
                    ]),
                    itemListSchema(
                        view.listing.map((product) => ({
                            name: product.name,
                            path: `${sectionPath}/${encodeSlug(product.slug)}`,
                        })),
                        sectionName
                    ),
                ]}
            />
            {offer && (
                <OfferBanner
                    {...offer}
                    section={view.translations[0]?.name ?? ""}
                />
            )}
            <SubCategoryPage subCategory={view} categorySlug={categorySlug} siblings={alsoIn} />
        </>
    )
}
