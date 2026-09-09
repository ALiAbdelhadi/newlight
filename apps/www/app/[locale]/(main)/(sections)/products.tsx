import { encodeSlug, type SerializedMoney } from "@repo/database"
import { getTranslations } from "next-intl/server"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { ProductCard } from "@/components/product-card"
import { EmptyState } from "@/components/states"
import { Link } from "@/i18n/navigation"

interface ProductsProps {
    products: UIProduct[]
}

/**
 * A view model, built on the SERVER.
 *
 * Money is a string by the time it gets here (§4, ADR 0001), because the server made it one —
 * this component used to take raw Prisma rows and serialise them on the wrong side of the
 * boundary, which React rejected 231 times per page load.
 */
export interface UIProduct {
    id: string
    image: string
    title: string
    category: string
    /** What the customer pays — discounted where a discount is live (§13.2). */
    price: SerializedMoney
    /** The undiscounted price. Equal to `price` when nothing is on offer. */
    basePrice: SerializedMoney
    discountPercent: number
    slug: string
    badge?: string
    productId: string
    categorySlug: string
    subCategorySlug: string
}

/**
 * The featured strip on the homepage.
 *
 * A server component now — nothing here needed the client. It was the one section on the
 * homepage that did not use `Section`/`SectionHeader`: it wrapped itself in `min-h-screen`
 * (a full viewport of height whether it had eight products or none), set its own 60px
 * `font-light` heading, its own `mb-16` and its own `gap-12`, and so sat visibly apart from the
 * offers band above it and the collection below. It also had no way to the catalogue: eight
 * products and no "see everything".
 *
 * The grid is the PLP's grid, gap for gap, so a card is the same size here as on the page the
 * "Browse" link leads to.
 */
export async function Products({ products }: ProductsProps) {
    const t = await getTranslations("products-section")

    return (
        <Section aria-label={t("headerTitle")}>
            <Container>
                <SectionHeader
                    eyebrow={t("eyebrow")}
                    title={t("headerTitle")}
                    description={t("headerDescription")}
                    action={
                        <Link
                            href="/category"
                            className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t("browseAll")}
                            <DirectionalArrow />
                        </Link>
                    }
                />

                {products.length === 0 ? (
                    <EmptyState variant="no-data" title={t("noProducts")} className="rounded-lg border bg-surface-sunk" />
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={`/category/${encodeSlug(product.categorySlug)}/${encodeSlug(product.subCategorySlug)}/${encodeSlug(product.slug)}`}
                                className="block"
                            >
                                <ProductCard {...product} />
                            </Link>
                        ))}
                    </div>
                )}
            </Container>
        </Section>
    )
}
