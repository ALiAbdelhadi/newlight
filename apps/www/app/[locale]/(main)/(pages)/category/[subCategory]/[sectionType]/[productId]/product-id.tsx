"use client"

import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import { Check, X, ChevronRight } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

type Product = {
    id: string
    productId: string
    slug: string
    price: number
    inventory: number
    images: string[]
    voltage: string | null
    maxWattage: number | null
    brandOfLed: string | null
    luminousFlux: string | null
    mainMaterial: string | null
    cri: string | null
    beamAngle: number | null
    productDimensions: string | null
    holeSize: string | null
    powerFactor: string | null
    colorTemperatures: string[]
    ipRating: string | null
    maxIpRating: string | null
    lifeTime: number | null
    availableColors: string[]
    isActive: boolean
    isFeatured: boolean
    translations: Array<{
        locale: string
        name: string
        description: string | null
    }>
    subCategory: {
        id: string
        slug: string
        translations: Array<{
            locale: string
            name: string
        }>
        category: {
            id: string
            slug: string
            categoryType: "indoor" | "outdoor"
            translations: Array<{
                locale: string
                name: string
            }>
        }
    }
}

interface ProductIdPageProps {
    product: Product
    locale: string
}

export default function ProductIdPage({ product }: ProductIdPageProps) {
    const t = useTranslations("product-page")
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const heroRef = useRef<HTMLElement>(null)
    const specsRef = useRef<HTMLElement>(null)

    const productTranslation = product.translations[0]
    const subCategoryTranslation = product.subCategory.translations[0]
    const categoryTranslation = product.subCategory.category.translations[0]

    const productName = productTranslation?.name || product.productId
    const productDescription = productTranslation?.description
    const subCategoryName = subCategoryTranslation?.name || product.subCategory.slug
    const categoryName = categoryTranslation?.name || product.subCategory.category.categoryType

    useEffect(() => {
        if (!heroRef.current) return

        const ctx = gsap.context(() => {
            gsap.from(heroRef.current?.children || [], {
                opacity: 0,
                y: 30,
                duration: 1,
                stagger: 0.15,
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
        if (!specsRef.current) return

        const ctx = gsap.context(() => {
            gsap.from(specsRef.current?.children || [], {
                opacity: 0,
                y: 25,
                duration: 0.8,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: specsRef.current,
                    start: "top 85%",
                    once: true,
                },
            })
        })

        return () => ctx.revert()
    }, [])

    const specifications = [
        { label: t("voltage"), value: product.voltage },
        { label: t("maxWattage"), value: product.maxWattage ? `${product.maxWattage}W` : null },
        { label: t("brandOfLed"), value: product.brandOfLed },
        { label: t("luminousFlux"), value: product.luminousFlux },
        { label: t("mainMaterial"), value: product.mainMaterial },
        { label: t("cri"), value: product.cri },
        { label: t("beamAngle"), value: product.beamAngle ? `${product.beamAngle}°` : null },
        { label: t("productDimensions"), value: product.productDimensions },
        { label: t("holeSize"), value: product.holeSize },
        { label: t("powerFactor"), value: product.powerFactor },
        { label: t("ipRating"), value: product.ipRating },
        { label: t("maxIpRating"), value: product.maxIpRating },
        {
            label: t("lifeTime"),
            value: product.lifeTime ? `${product.lifeTime.toLocaleString()} ${t("hours")}` : null,
        },
    ].filter((spec) => spec.value)

    return (
        <main className="min-h-screen bg-background">
            {/* Breadcrumb */}
            <section className="pt-28 pb-6 lg:pt-32">
                <Container>
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link
                            href={`/category/${product.subCategory.category.slug}`}
                            className="hover:text-foreground transition-colors font-light tracking-wide"
                        >
                            {categoryName}
                        </Link>
                        <ChevronRight className="w-4 h-4 rtl:rotate-180 text-muted-foreground/50" />
                        <Link
                            href={`/category/${product.subCategory.category.slug}/${product.subCategory.slug}`}
                            className="hover:text-foreground transition-colors font-light tracking-wide"
                        >
                            {subCategoryName}
                        </Link>
                        <ChevronRight className="w-4 h-4 rtl:rotate-180 text-muted-foreground/50" />
                        <span className="text-foreground font-light tracking-wide">{productName}</span>
                    </nav>
                </Container>
            </section>

            {/* Product Hero */}
            <section ref={heroRef} className="pb-20 lg:pb-28">
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                        {/* Product Images */}
                        <div className="space-y-4">
                            <div className="relative aspect-square bg-muted rounded-sm overflow-hidden">
                                {product.images.length > 0 ? (
                                    <Image
                                        src={product.images[selectedImageIndex] || product.images[0]}
                                        alt={productName}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-light">
                                        {t("noImage")}
                                    </div>
                                )}
                                {product.isFeatured && (
                                    <div className="absolute top-4 left-4 z-10">
                                        <span className="px-4 py-2 bg-accent text-accent-foreground text-xs uppercase tracking-widest font-light rounded-sm">
                                            {t("featured")}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Gallery */}
                            {product.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-3">
                                    {product.images.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={`relative aspect-square bg-muted rounded-sm overflow-hidden border-2 transition-all duration-300 ${selectedImageIndex === index ? "border-accent" : "border-transparent hover:border-border"
                                                }`}
                                        >
                                            <Image
                                                src={image || "/placeholder.svg"}
                                                alt={`${productName} - ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-8 lg:pt-4">
                            {/* Header */}
                            <div className="space-y-4">
                                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">{subCategoryName}</p>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-tight text-foreground leading-[1.1]">
                                    {productName}
                                </h1>
                                <div className="h-px w-16 bg-accent" />
                            </div>

                            {/* Description */}
                            {productDescription && (
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-muted-foreground font-light leading-relaxed text-base tracking-wide">
                                        {productDescription}
                                    </p>
                                </div>
                            )}

                            {/* Price */}
                            <div className="flex items-baseline gap-2 py-6 border-y border-border">
                                <span className="text-lg font-light text-muted-foreground">{t("currency")}</span>
                                <span className="text-5xl md:text-6xl font-serif font-light tracking-tight text-foreground">
                                    {product.price.toLocaleString()}
                                </span>
                            </div>

                            {/* Stock Status */}
                            <div>
                                {product.inventory > 0 ? (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="font-light tracking-wide text-green-700">
                                            {t("inStock")} ({t("available", { count: product.inventory })})
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700">
                                            <X className="w-4 h-4" />
                                        </div>
                                        <span className="font-light tracking-wide text-red-700">{t("outOfStock")}</span>
                                    </div>
                                )}
                            </div>

                            {/* Color Temperature */}
                            {product.colorTemperatures.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                                        {t("colorTemperature")}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.colorTemperatures.map((temp) => (
                                            <span
                                                key={temp}
                                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm font-light tracking-wide"
                                            >
                                                {temp.replace("_", " ")}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Available Colors */}
                            {product.availableColors.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                                        {t("availableColors")}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {product.availableColors.map((color) => (
                                            <span
                                                key={color}
                                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-sm text-sm font-light tracking-wide capitalize"
                                            >
                                                {color}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Container>
            </section>

            {/* Specifications */}
            {specifications.length > 0 && (
                <section ref={specsRef} className="border-t border-border bg-secondary/20 py-20 lg:py-28">
                    <Container>
                        <div className="mb-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light mb-4">Technical</p>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light tracking-tight text-foreground">
                                {t("specifications")}
                            </h2>
                            <div className="h-px w-16 bg-accent mt-4" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                            {specifications.map((spec, index) => (
                                <div
                                    key={index}
                                    className="bg-card border border-border rounded-sm p-6 hover:border-accent/50 transition-colors duration-300"
                                >
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-light mb-2">
                                        {spec.label}
                                    </p>
                                    <p className="text-lg font-light text-foreground tracking-wide">{spec.value}</p>
                                </div>
                            ))}
                        </div>
                    </Container>
                </section>
            )}
        </main>
    )
}
