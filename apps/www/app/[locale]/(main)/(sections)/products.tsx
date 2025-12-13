"use client"

import { Container } from "@/components/container"
import { ProductCard } from "@/components/product-card"
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation"

interface Product {
    id: string;
    image: string;
    title: string;
    category: string;
    price: number;
    badge?: string;
    productId: string;
    categorySlug: string;
    subCategorySlug: string;
}

type ProductFromDB = {
    id: string;
    productId: string;
    slug: string;
    price: number;
    images: string[];
    isFeatured: boolean;
    translations: Array<{
        locale: string;
        name: string;
        description: string | null;
    }>;
    subCategory: {
        slug: string;
        translations: Array<{
            locale: string;
            name: string;
            description: string | null;
        }>;
        category: {
            slug: string;
            translations: Array<{
                locale: string;
                name: string;
                description: string | null;
            }>;
        };
    };
}

interface ProductsProps {
    products: ProductFromDB[];
}

export function Products({ products }: ProductsProps) {
    const t = useTranslations('products-section');

    const handleProductClick = (productId: string) => {
        console.log(`Clicked product: ${productId}`)
    }

    const mappedProducts: Product[] = products.map(product => {
        const productTranslation = product.translations[0]
        const subCategoryTranslation = product.subCategory.translations[0]
        const productName = productTranslation?.name || product.productId
        const categoryName = subCategoryTranslation?.name || product.subCategory.slug
        const productImage = product.images[0] || "/placeholder.svg"

        return {
            id: product.id,
            image: productImage,
            title: productName,
            category: categoryName,
            price: product.price,
            badge: product.isFeatured ? "Featured" : undefined,
            productId: product.productId,
            categorySlug: product.subCategory.category.slug,
            subCategorySlug: product.subCategory.slug,
        }
    });


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
                                        href={`/category/${product.categorySlug}/${product.subCategorySlug}/${product.productId}`}
                                        className="block"
                                    >
                                        <ProductCard
                                            {...product}
                                            onClick={() => handleProductClick(product.id)}
                                        />
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