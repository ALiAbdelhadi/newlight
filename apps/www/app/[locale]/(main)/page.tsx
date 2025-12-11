import { getAllProducts } from "@/lib/db";
import { getLocale } from "next-intl/server";
import CategorySection from "./(sections)/categories";
import { CTASection } from "./(sections)/cta-section";
import { FeaturesSection } from "./(sections)/featuers-section";
import { Hero } from "./(sections)/hero";
import { NewCollection } from "./(sections)/lighting-collection";
import { Products } from "./(sections)/products";

export default async function MainPage() {
    const currentLocale = await getLocale();
    const products = await getAllProducts(currentLocale, 8);

    return (
        <>
            <Hero />
            <NewCollection />
            <Products products={products} />
            <CategorySection />
            <FeaturesSection />
            <CTASection />
        </>
    )
}