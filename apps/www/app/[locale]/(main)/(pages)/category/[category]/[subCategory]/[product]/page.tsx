import type { Metadata } from "next"
import { ProductStrip } from "@/components/product-strip"
import { JsonLd, breadcrumbSchema, productSchema } from "@/lib/structured-data"
import { PurchaseAssurance } from "@/components/purchase-assurance"
import { RecentlyViewed, RecordView } from "@/components/recently-viewed"
import { relatedProducts } from "@/lib/services/merchandising-service"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import { encodeSlug, resolveLocale } from "@repo/database"
import { ProductService } from "@/lib/services/product-service"
import { constructMetadata } from "@/lib/metadata"
import { resolveProductSlug } from "@/lib/services/taxonomy"
import ProductPage from "./product-page"

export const revalidate = 3600

type Props = { params: Promise<{ category: string; subCategory: string; product: string; locale: string }> }

/**
 * A product page, addressed by SLUG.
 *
 * §9.3 moves this route from `[productId]` to the slug — a behaviour change, not a rename.
 * Seven products' URLs change as a result (their slug differs from their SKU, mostly because
 * the SKU contains `*` or `.`), and `resolveProductSlug` 301s the old ones through
 * ProductSlugHistory rather than 404ing them.
 *
 * A product slug is shared across locales (§9.3), unlike taxonomy slugs — so this resolver
 * takes no locale.
 */
async function load(params: Props["params"]) {
    const { category, subCategory, product } = await params
    const locale = resolveLocale(await getLocale())
    const slug = decodeURIComponent(product)

    const resolution = await resolveProductSlug(slug)
    if (resolution.kind === "moved") {
        permanentRedirect(
            `/${locale}/category/${encodeSlug(decodeURIComponent(category))}/${encodeSlug(decodeURIComponent(subCategory))}/${encodeSlug(resolution.to)}`
        )
    }
    if (resolution.kind === "missing") notFound()

    const view = await ProductService.getProductBySlug(slug, locale)
    if (!view) notFound()
    return { view, locale }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { view, locale } = await load(params)
    const t = await getTranslations("metadatas.product-page")
    const translation = view.translations[0]
    const name = translation?.name ?? view.productId
    const categoryName = view.subCategory.translations[0]?.name ?? ""
    const specs = view.specs
        .slice(0, 3)
        .map((row) => `${row.spec.labelEn}: ${row.valueEn}`)
        .join(", ")

    return constructMetadata({
        // N3: metaTitle is empty on all 378 rows, so the stored field is the source WHEN SET
        // and a generated title is the fallback — one mechanism with a default, not two.
        title: translation?.metaTitle || t("title", { name, category: categoryName }),
        description:
            translation?.metaDescription || translation?.description || t("description", { name, category: categoryName, specs }),
        locale,
        image: view.images[0]?.url,
    })
}

export default async function Page({ params }: Props) {
    const { view, locale } = await load(params)
    const [t, related] = await Promise.all([
        getTranslations("merchandising"),
        relatedProducts({ id: view.id, familyId: view.familyId, subCategoryId: view.subCategoryId }, locale),
    ])
    const section = view.subCategory.translations[0]
    const category = view.subCategory.category.translations[0]

    const productName = view.translations[0]?.name ?? view.productId
    const categoryPath = `/${locale}/category/${encodeSlug(category?.slug ?? "")}`
    const sectionPath = `${categoryPath}/${encodeSlug(section?.slug ?? "")}`
    const productPath = `${sectionPath}/${encodeSlug(view.slug)}`

    /*
     * The spec rows a crawler gets are the spec rows the table shows: the same
     * `valueEn`/`valueAr` and the same unit, with the PLACEHOLDER "-" dropped the same way.
     * Two assemblies of one list is how a page ends up claiming a wattage it does not print.
     */
    const specs = view.specs.flatMap((row) => {
        const value = locale === "ar" ? row.valueAr : row.valueEn
        if (!value || value === "-") return []
        const unit = locale === "ar" ? row.spec.unitAr : row.spec.unitEn
        return [{
            label: locale === "ar" ? row.spec.labelAr : row.spec.labelEn,
            value: unit ? `${value} ${unit}` : value,
        }]
    })

    /*
     * The buy column and the specification table are the client component; everything a
     * shopper looks at AFTER deciding — the rest of the section, what they looked at before —
     * is composed here on the server, through the same strip every other page uses.
     */
    return (
        <>
            {/*
             * Price, availability and the trail, for the reader that never renders the page.
             * `price` is `view.price`, which IS the discounted price the buy button charges —
             * a schema that quotes the undiscounted one is a page Google will flag.
             */}
            <JsonLd
                data={[
                    productSchema(
                        {
                            name: productName,
                            description: view.translations[0]?.description,
                            sku: view.productId,
                            images: view.images.map((image) => image.url),
                            url: productPath,
                            price: view.price,
                            inStock: view.inStock,
                            category: section?.name,
                            specs,
                        },
                        locale
                    ),
                    breadcrumbSchema([
                        { name: category?.name ?? "", path: categoryPath },
                        { name: section?.name ?? "", path: sectionPath },
                        { name: productName, path: productPath },
                    ]),
                ]}
            />
            <ProductPage product={view} assurance={<PurchaseAssurance />} />
            <RecordView sku={view.productId} />
            <ProductStrip
                cards={related}
                eyebrow={t("related.eyebrow", { section: section?.name ?? "" })}
                title={t("related.title")}
                href={`/category/${encodeSlug(category?.slug ?? "")}/${encodeSlug(section?.slug ?? "")}`}
                hrefLabel={t("related.link", { section: section?.name ?? "" })}
                tone="sunk"
            />
            <RecentlyViewed exclude={view.productId} />
        </>
    )
}
