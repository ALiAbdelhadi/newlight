"use client"

import CategoryCard from "@/components/category-card"
import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import { ArrowLeft } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

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
    locale: string
}

export default function SubCategoryPage({ category }: SubCategoryPageProps) {
    const t = useTranslations("sub-category-page")
    const heroRef = useRef<HTMLElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<HTMLDivElement[]>([])

    const categoryTranslation = category.translations[0]
    const categoryName = categoryTranslation?.name || category.categoryType

    useEffect(() => {
        if (!heroRef.current) return

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
        })

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (cardRefs.current.length === 0) return

        cardRefs.current.forEach((el, index) => {
            if (!el) return

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

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        }
    }, [category.subCategories])

    return (
        <main className="min-h-screen bg-background">
            {/* Hero Section */}
            <section ref={heroRef} className="pt-28 pb-16 lg:pt-36 lg:pb-20">
                <Container>
                    {/* Back Link */}
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

            {/* Subcategories Grid */}
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
                                            if (el) cardRefs.current[index] = el
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
