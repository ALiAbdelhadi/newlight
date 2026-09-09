import { encodeSlug, type SerializedMoney } from "@repo/database"
import type { StockStatus } from "@/lib/stock"
import { getTranslations } from "next-intl/server"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { ProductCard } from "@/components/product-card"
import { EmptyState } from "@/components/states"
import { Link } from "@/i18n/navigation"

interface ProductsProps {
    products: UIProduct[]
}

export interface UIProduct {
    id: string
    image: string
    title: string
    category: string
    price: SerializedMoney
    basePrice: SerializedMoney
    discountPercent: number
    slug: string
    badge?: string
    productId: string
    categorySlug: string
    subCategorySlug: string
    stock: StockStatus
}

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
