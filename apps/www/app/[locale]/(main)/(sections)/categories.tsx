"use client"
import CategoryCard from "@/components/category-card"
import { Container } from "@/components/container"
import gsap from "gsap"
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from "react"

interface CategoryData {
    title: string;
    subtitle: string;
    description: string;
    href: string;
}

interface CategoryCardRenderProps extends CategoryData {
    imageUrl: string;
    index: number;
}

export default function CategorySection() {
    const t = useTranslations('category-section');

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

    const categoriesKeys: Array<'indoor' | 'outdoor'> = ['indoor', 'outdoor'];

    const categories: CategoryCardRenderProps[] = categoriesKeys.map((key, index) => {
        const categoryData = t.raw(`categories.${key}`) as CategoryData;

        return {
            ...categoryData,
            imageUrl: index === 0
                ? "/category/indoor-lighting-1.png"
                : "/category/outdoor-lighting-1.png",
            index: index,
        };
    });

    return (
        <div className="min-h-screen">
            <Container>
                <div className="py-12 lg:py-20">
                    <div ref={headerRef} className="max-w-4xl mb-20">
                        <h1
                            ref={titleRef}
                            className="text-5xl md:text-6xl font-light tracking-tight mb-4"
                        >
                            {t('header.title')}
                        </h1>
                        <p
                            ref={subtitleRef}
                            className="text-lg md:text-xl font-light text-muted-foreground tracking-wide"
                        >
                            {t('header.subtitle')}
                        </p>
                        <div className="mt-8 h-px w-16 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.href}
                                {...category}
                                index={category.index}
                            />
                        ))}
                    </div>
                    <div className="mt-24 pt-16 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    {t('features.consultationTitle')}
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    {t('features.consultationDescription')}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    {t('features.technicalTitle')}
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    {t('features.technicalDescription')}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm uppercase tracking-widest mb-3 text-foreground">
                                    {t('features.qualityTitle')}
                                </h3>
                                <p className="text-sm font-light text-muted-foreground leading-relaxed">
                                    {t('features.qualityDescription')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}