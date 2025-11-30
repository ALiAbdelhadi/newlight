"use client"
import CategoryCard from "@/components/category-card"
import { Container } from "@/components/container"
import gsap from "gsap"
import { useEffect, useRef } from "react"

export default function CategorySection() {
    const headerRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.set([titleRef.current, subtitleRef.current], {
                opacity: 0,
                y: 30,
            })

            const tl = gsap.timeline()

            tl.to(titleRef.current, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
            })

            tl.to(subtitleRef.current, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
            }, "-=0.7")
        })

        return () => ctx.revert()
    }, [])

    const categories = [
        {
            title: "Indoor Lighting",
            subtitle: "Interior Collection",
            description: "Sophisticated lighting solutions designed to enhance every interior space. From ambient ceiling fixtures to accent wall lights, our indoor collection combines aesthetic excellence with functional illumination.",
            imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80",
            href: "/category/indoor",
        },
        {
            title: "Outdoor Lighting",
            subtitle: "Exterior Collection",
            description: "Weather-resistant lighting engineered for outdoor environments. Illuminate gardens, pathways, and architectural features with fixtures built to withstand the elements while delivering exceptional performance.",
            imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
            href: "/category/outdoor",
        },
    ]

    return (
        <div className="min-h-screen bg-background">
            <Container>
                <div className="py-12 lg:py-20">
                    <div ref={headerRef} className="max-w-4xl mb-20">
                        <h1
                            ref={titleRef}
                            className="text-5xl md:text-6xl font-light tracking-tight mb-4"
                        >
                            Product Categories
                        </h1>
                        <p
                            ref={subtitleRef}
                            className="text-lg md:text-xl font-light text-muted-foreground tracking-wide"
                        >
                            Discover our curated collections of premium lighting solutions,
                            meticulously designed for both interior and exterior applications.
                        </p>
                        <div className="mt-8 h-px w-16 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
                        {categories.map((category, index) => (
                            <CategoryCard
                                key={category.title}
                                {...category}
                                index={index}
                            />
                        ))}
                    </div>
                    <div className="mt-24 pt-16 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    Expert Consultation
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    Professional lighting design assistance to help you select the perfect fixtures for your project.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    Technical Support
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    Comprehensive installation guides and technical specifications for all products.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    Quality Assurance
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    All fixtures undergo rigorous testing to meet international lighting standards.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}