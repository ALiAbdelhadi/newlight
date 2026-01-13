"use client"

import { Container } from "@/components/container"
import { ProductCard } from "@/components/product-card"
import { Link } from "@/i18n/navigation"
import { SubCategory } from "@/types"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

interface SectionTypePageProps {
    subCategory: SubCategory
}

export default function SectionTypePage({ subCategory }: SectionTypePageProps) {
    const t = useTranslations("section-type-page")
    const heroRef = useRef<HTMLElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<HTMLDivElement[]>([])
    const [isClient, setIsClient] = useState(false)

    const subCategoryTranslation = subCategory.translations[0]
    const categoryTranslation = subCategory.category.translations[0]
    const subCategoryName = subCategoryTranslation?.name || subCategory.slug
    const categoryName = categoryTranslation?.name || subCategory.category.categoryType

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
                    start: "top 60%",
                    once: true,
                },
            })
        }, heroRef)

        return () => ctx.revert()
    }, [isClient])

    useEffect(() => {
        if (!isClient) return

        const validRefs = cardRefs.current.filter((el): el is HTMLDivElement => el !== null && el !== undefined)
        if (validRefs.length === 0) return

        const ctx = gsap.context(() => {
            validRefs.forEach((el, index) => {
                gsap.from(el, {
                    opacity: 0,
                    y: 40,
                    duration: 0.7,
                    delay: index * 0.05,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: el,
                        start: "top 66%",
                        once: true,
                    },
                })
            })
        }, gridRef)

        return () => ctx.revert()
    }, [isClient, subCategory.products])

    const productCount = subCategory.products.length
    const productLabel = productCount === 1 ? t("product") : t("products")

    return (
        <div className="min-h-screen">
            <section ref={heroRef} className="py-24">
                <Container>
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
            <section ref={gridRef} className="pb-28 lg:pb-36">
                <Container>
                    {subCategory.products.length === 0 ? (
                        <div className="text-center py-24 border border-border rounded-sm bg-secondary/20">
                            <p className="text-muted-foreground font-light text-lg tracking-wide">{t("noProducts")}</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10 pb-6 border-b border-border">
                                <p className="text-sm text-muted-foreground font-light tracking-wide">
                                    {productCount} {productLabel}
                                </p>
                            </div>
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
        </div>
    )
}