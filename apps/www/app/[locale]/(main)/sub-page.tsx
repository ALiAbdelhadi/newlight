import { resolveLocale } from "@repo/database"
import { getLocale, getTranslations } from "next-intl/server"

import { ProductStrip } from "@/components/product-strip"
import { RecentlyViewed } from "@/components/recently-viewed"
import { ShopByCategory } from "@/components/shop-by-category"
import { bestSellers, newestProducts } from "@/lib/services/merchandising-service"
import { Collection } from "./(sections)/collection"
import { CTASection } from "./(sections)/cta-section"
import { FeaturesSection } from "./(sections)/features-section"
import { Hero } from "./(sections)/hero"
import { OffersSection } from "./(sections)/offers-section"
import ProductsSection from "./(sections)/products-section"

export default async function SubPage() {
    const locale = resolveLocale(await getLocale())
    const [t, newest, bought] = await Promise.all([
        getTranslations("merchandising"),
        newestProducts(locale),
        bestSellers(locale),
    ])

    return (
        <>
            <Hero />
            <Collection />
            <OffersSection />
            <ShopByCategory />
            <ProductsSection />
            <ProductStrip
                cards={newest}
                eyebrow={t("newArrivals.eyebrow")}
                title={t("newArrivals.title")}
                description={t("newArrivals.description")}
                href="/category"
                hrefLabel={t("browseAll")}
                tone="sunk"
            />
            <ProductStrip
                cards={bought}
                eyebrow={t("bestSellers.eyebrow")}
                title={t("bestSellers.title")}
                description={t("bestSellers.description")}
                href="/category"
                hrefLabel={t("browseAll")}
                tone="sunk"
            />
            <FeaturesSection />
            <RecentlyViewed tone="sunk" />
            <CTASection />
        </>
    )
}
