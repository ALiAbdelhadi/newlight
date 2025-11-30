import CategorySection from "./(sections)/categories";
import { CTASection } from "./(sections)/cta-section";
import { FeaturesSection } from "./(sections)/featuers-section";
import { Hero } from "./(sections)/hero";
import { NewCollection } from "./(sections)/lighting-collection";
import { Products } from "./(sections)/products";


export default function MainPage() {
    return (
        <>
            <Hero />
            <NewCollection />
            <Products />
            <CategorySection />
            <FeaturesSection />
            <CTASection />
        </>
    )
}