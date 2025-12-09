"use client"

import { Container } from "@/components/container"
import { ProductCard } from "@/components/product-card"
import { Link } from "@/i18n/navigation"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

type SubCategory = {
    id: string
    slug: string
    imageUrl: string | null
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    category: {
        id: string
        slug: string
        categoryType: "indoor" | "outdoor"
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
    }
    products: Array<{
        id: string
        productId: string
        slug: string
        price: number
        images: string[]
        isFeatured: boolean
        translations: Array<{
            locale: string
            name: string
            description: string | null
        }>
    }>
}

interface SectionTypePageProps {
    subCategory: SubCategory
    locale: string
}

export default function SectionTypePage({ subCategory }: SectionTypePageProps) {
    const t = useTranslations("section-type-page")
    const heroRef = useRef<HTMLElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<HTMLDivElement[]>([])

    const subCategoryTranslation = subCategory.translations[0]
    const categoryTranslation = subCategory.category.translations[0]
    const subCategoryName = subCategoryTranslation?.name || subCategory.slug
    const categoryName = categoryTranslation?.name || subCategory.category.categoryType

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
                duration: 0.9,
                delay: index * 0.08,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 88%",
                    once: true,
                },
            })
        })

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        }
    }, [subCategory.products])

    const productCount = subCategory.products.length
    const productLabel = productCount === 1 ? t("product") : t("products")

    return (
        <main className="min-h-screen bg-background">
            {/* Hero Section */}
            <section ref={heroRef} className="pt-28 pb-12 lg:pt-36 lg:pb-16">
                <Container>
                    {/* Back Link */}
                    <Link
                        href={`/category/${subCategory.category.slug}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:-translate-x-1" />
                        <span className="font-light tracking-wide">{categoryName}</span>
                    </Link>

                    <div className="max-w-3xl space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">{categoryName}</p>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-light tracking-tight text-foreground text-balance leading-[1.1]">
                                {subCategoryName}
                            </h1>
                            <div className="h-px w-20 bg-accent" />
                        </div>
                        {subCategoryTranslation?.description && (
                            <p className="text-lg md:text-xl font-light text-muted-foreground tracking-wide max-w-2xl leading-relaxed">
                                {subCategoryTranslation.description}
                            </p>
                        )}
                    </div>
                </Container>
            </section>

            {/* Products Grid */}
            <section ref={gridRef} className="pb-28 lg:pb-36">
                <Container>
                    {subCategory.products.length === 0 ? (
                        <div className="text-center py-24 border border-border rounded-sm bg-secondary/20">
                            <p className="text-muted-foreground font-light text-lg tracking-wide">{t("noProducts")}</p>
                        </div>
                    ) : (
                        <>
                            {/* Products Count */}
                            <div className="mb-10 pb-6 border-b border-border">
                                <p className="text-sm text-muted-foreground font-light tracking-wide">
                                    {productCount} {productLabel}
                                </p>
                            </div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                                {subCategory.products.map((product, index) => {
                                    const productTranslation = product.translations[0]
                                    const productName = productTranslation?.name || product.productId
                                    const productImage = product.images[0] || "/lighting-product.jpg"
                                    return (
                                        <div
                                            key={product.id}
                                            ref={(el) => {
                                                if (el) cardRefs.current[index] = el
                                            }}
                                        >
                                            <Link
                                                href={`/category/${subCategory.category.slug}/${subCategory.slug}/${product.productId}`}
                                                className="block"
                                            >
                                                <ProductCard
                                                    id={product.id}
                                                    image={productImage}
                                                    title={productName}
                                                    category={subCategoryName}
                                                    price={product.price}
                                                    badge={product.isFeatured ? "Featured" : undefined}
                                                />
                                            </Link>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </Container>
            </section>
        </main>
    )
}
