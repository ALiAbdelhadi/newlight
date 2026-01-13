import CategorySection from "./(sections)/categories";
import { Collection } from "./(sections)/collection";
import { CTASection } from "./(sections)/cta-section";
import { FeaturesSection } from "./(sections)/features-section";
import { Hero } from "./(sections)/hero";
import ProductsSection from "./(sections)/products-section";

export default function SubPage() {
    return (
        <>
            <Hero />
            <Collection />
            <ProductsSection />
            <CategorySection />
            <FeaturesSection />
            <CTASection />
        </>
    )
}