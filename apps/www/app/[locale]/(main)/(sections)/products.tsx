"use client"

import { Container } from "@/components/container"
import { ProductCard } from "@/components/product-card"
import { useTranslations } from 'next-intl';

interface Product {
    id: string;
    image: string;
    title: string;
    category: string;
    price: number;
    badge?: string;
}

const PRODUCT_BASE_DATA = [
    {
        id: "1",
        image: "/products/indoor/2×120-led/nl-2×120-30w.png",
        price: 299,
        titleKey: "pendantLightTitle",
        categoryKey: "categoryResidential",
        badgeKey: "badgeNew",
    },
    {
        id: "2",
        image: "/products/indoor/cob/nl-recessed/nl-recessed-5w.png",
        price: 149,
        titleKey: "wallSconceTitle",
        categoryKey: "categoryIndoor",
    },
    {
        id: "3",
        image: "/products/indoor/cob-frames/ln-1995-bronze-rounded/ln-1995-bronze-rounded (1).png",
        price: 399,
        titleKey: "floorLampTitle",
        categoryKey: "categoryResidential",
        badgeKey: "badgeFeatured",
    },
    {
        id: "4",
        image: "/products/outdoor/blade/nl-111-gray-7w/nl-111-gray-7w.png",
        price: 199,
        titleKey: "tableLampTitle",
        categoryKey: "categoryIndoor",
    },
    {
        id: "5",
        image: "/products/indoor/magnatic/nl-609-6w/nl-609-6w (1).png",
        price: 549,
        titleKey: "ceilingFixtureTitle",
        categoryKey: "categoryResidential",
    },
    {
        id: "6",
        image: "/products/outdoor/blukhead/nl-bh-18w.png",
        price: 179,
        titleKey: "outdoorLightTitle",
        categoryKey: "categoryOutdoor",
        badgeKey: "badgeSale",
    },
];

export function Products() {
    const t = useTranslations('products-section');
    const tProductData = useTranslations('products-section.productData');


    const handleProductClick = (productId: string) => {
        console.log(`Clicked product: ${productId}`)
    }

    const localizedProducts: Product[] = PRODUCT_BASE_DATA.map(baseProduct => ({
        id: baseProduct.id,
        image: baseProduct.image,
        price: baseProduct.price,
        title: tProductData(baseProduct.titleKey),
        category: tProductData(baseProduct.categoryKey),
        badge: baseProduct.badgeKey ? tProductData(baseProduct.badgeKey) : undefined,
    }));


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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                            {localizedProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    {...product}
                                    onClick={() => handleProductClick(product.id)}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            </Container>
        </div>
    )
}