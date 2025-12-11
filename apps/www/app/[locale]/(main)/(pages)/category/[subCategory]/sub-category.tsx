"use client"

import CategoryCard from "@/components/category-card"
import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"

// Register plugin only once on client side
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

type Category = {
    id: string
    categoryType: "indoor" | "outdoor"
    slug: string
    imageUrl: string | null
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    subCategories: Array<{
        id: string
        slug: string
        imageUrl: string | null
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
        _count: {
            products: number
        }
    }>
}

interface SubCategoryPageProps {
    category: Category
}

export default function SubCategoryPage({ category }: SubCategoryPageProps) {
    const t = useTranslations("sub-category-page")
    const heroRef = useRef<HTMLElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const [isClient, setIsClient] = useState(false)

    const categoryTranslation = category.translations[0]
    const categoryName = categoryTranslation?.name || category.categoryType

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isClient || !heroRef.current) return

        const ctx = gsap.context(() => {
            gsap.from(heroRef.current, {
                opacity: 0,
                y: 30,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: "top 80%",
                    once: true,
                },
            })
        }, heroRef)

        return () => ctx.revert()
    }, [isClient])

    useEffect(() => {
        if (!isClient || category.subCategories.length === 0) return

        // Filter out null refs and ensure we have valid elements
        const validCards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null)
        if (validCards.length === 0) return

        const ctx = gsap.context(() => {
            validCards.forEach((el, index) => {
                gsap.from(el, {
                    opacity: 0,
                    y: 40,
                    duration: 1,
                    delay: index * 0.12,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%",
                        once: true,
                    },
                })
            })
        }, gridRef)

        return () => ctx.revert()
    }, [isClient, category.subCategories])

    return (
        <main className="min-h-screen bg-background">
            <section ref={heroRef} className="py-24">
                <Container>
                    <Link
                        href="/category"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:-translate-x-1" />
                        <span className="font-light tracking-wide">{t("backTo", { category: "Categories" })}</span>
                    </Link>
                    <div className="max-w-3xl space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">Collection</p>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-light tracking-tight text-foreground text-balance leading-[1.1]">
                                {categoryName}
                            </h1>
                            <div className="h-px w-20 bg-accent" />
                        </div>
                        {categoryTranslation?.description && (
                            <p className="text-lg md:text-xl font-light text-muted-foreground tracking-wide max-w-2xl leading-relaxed">
                                {categoryTranslation.description}
                            </p>
                        )}
                    </div>
                </Container>
            </section>
            <section ref={gridRef} className="pb-28 lg:pb-36">
                <Container>
                    {category.subCategories.length === 0 ? (
                        <div className="text-center py-24 border border-border rounded-sm bg-secondary/20">
                            <p className="text-muted-foreground font-light text-lg tracking-wide">{t("noSubcategories")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                            {category.subCategories.map((subCategory, index) => {
                                const subCategoryTranslation = subCategory.translations[0]
                                const subCategoryName = subCategoryTranslation?.name || subCategory.slug
                                return (
                                    <div
                                        key={subCategory.id}
                                        ref={(el) => {
                                            cardRefs.current[index] = el
                                        }}
                                    >
                                        <CategoryCard
                                            title={subCategoryName}
                                            subtitle={categoryName}
                                            description={
                                                subCategoryTranslation?.description || t("exploreCollection", { name: subCategoryName })
                                            }
                                            imageUrl={subCategory.imageUrl || "/lighting-fixture.jpg"}
                                            href={`/category/${category.slug}/${subCategory.slug}`}
                                            index={index}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Container>
            </section>
        </main>
    )
}
