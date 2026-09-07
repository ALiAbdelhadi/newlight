import type { Metadata } from "next"
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
    const { view } = await load(params)
    return <ProductPage product={view} />
}
