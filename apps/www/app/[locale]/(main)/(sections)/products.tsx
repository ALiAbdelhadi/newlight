"use client"

import { encodeSlug, type SerializedMoney } from "@repo/database"
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { Link } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';

interface ProductsProps {
    products: UIProduct[];
}

/**
 * A view model, built on the SERVER.
 *
 * This component used to take raw Prisma rows and call `serializeMoney(product.price)` here,
 * which is the money boundary enforced on the wrong side of itself: a `Decimal` cannot cross
 * into a Client Component at all, and React said so 231 times in the console — "Only plain
 * objects can be passed to Client Components from Server Components. Decimal objects are not
 * supported". Whatever arrived was no longer a Decimal, so serialising it here was serialising
 * the wreckage.
 *
 * Money is a string by the time it gets here (§4, ADR 0001), because the server made it one.
 */
export interface UIProduct {
    id: string;
    image: string;
    title: string;
    category: string;
    price: SerializedMoney;
    slug: string;
    badge?: string;
    productId: string;
    categorySlug: string;
    subCategorySlug: string;
}

export function Products({ products }: ProductsProps) {
    const t = useTranslations('products-section');

    const mappedProducts = products

    return (
        <div className="min-h-screen text-foreground">
            <Container>
                <section className="pt-12 pb-6">
                    <div>
                        <div className="mb-16">
                            <h2 className="text-5xl md:text-6xl font-light tracking-tight mb-4">
                                {t('headerTitle')}
                            </h2>
                            <p className="text-lg text-muted-foreground font-light max-w-2xl">
                                {t('headerDescription')}
                            </p>
                        </div>
                    </div>
                </section>
                <section className="pb-20">
                    <div>
                        {mappedProducts.length === 0 ? (
                            <div className="text-center py-24 border border-border rounded-sm bg-secondary/20">
                                <p className="text-muted-foreground font-light text-lg tracking-wide">
                                    {t('noProducts') || 'No products available'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                                {mappedProducts.map((product) => (
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
                    </div>
                </section>
            </Container>
        </div>
    )
}