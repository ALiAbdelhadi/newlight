import CategorySection from "./(sections)/categories";
import { CTASection } from "./(sections)/cta-section";
import { FeaturesSection } from "./(sections)/features-section";
import { Hero } from "./(sections)/hero";
import { NewCollection } from "./(sections)/lighting-collection";
import ProductsSection from "./(sections)/products-section";

export default function MainPage() {


    return (
        <>
            <Hero />
            <NewCollection />
            <ProductsSection />
            <CategorySection />
            <FeaturesSection />
            <CTASection />
        </>
    )
}