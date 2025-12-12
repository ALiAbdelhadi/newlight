"use client"

import ProductColorTempButtons from "@/components/color-temp-buttons"
import { Container } from "@/components/container"
import ProductSurfaceColorButtons from "@/components/surface-color-button"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

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
    specifications?: Record<string, string | number | string[]>
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
}

export default function ProductIdPage({ product }: ProductIdPageProps) {
    const t = useTranslations("product-page")
    const locale = useLocale()
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedColorTemp, setSelectedColorTemp] = useState<string>(
        product.colorTemperatures[0] || ""
    )
    const [surfaceColor, setSurfaceColor] = useState<string>(
        product.availableColors[0] || ""
    )
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

    const preferredOrder = [
        "المدخل",
        "voltage",
        "أقصى قوة كهربائية (W)",
        "maximum_wattage",
        "علامة الليد التجارية",
        "brand_of_led",
        "اللومن",
        "luminous_flux",
        "مادة التصنيع",
        "main_material",
        "مؤشر تجسيد الألوان",
        "cri",
        "زاوية الإضاءة°",
        "beam_angle",
        "أبعاد المنتج",
        "product_dimensions",
        "حجم الفتحة",
        "hole_size",
        "معامل القدرة",
        "power_factor",
        "درجة الحماية",
        "IP",
        "أقصى درجة حماية",
        "maxIP",
        "العمر الافتراضي",
        "life_time",
        "درجة حرارة لون الاضاءة",
        "color_Temperature",
        "الالوان المتوفره الي المنتج",
        "surface_color",
    ] as const

    const formatter = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        ...(locale.startsWith("ar") ? { numberingSystem: "arab" } : {}),
    })

    const formatNumber = (value: number | string) => {
        const num = typeof value === "number" ? value : Number(value)
        if (Number.isFinite(num)) return formatter.format(num)
        return value.toString()
    }

    const formatColorTemps = (temps: string[]) => {
        const isArabic = locale.startsWith("ar")
        const map: Record<string, string> = {
            WARM_3000K: isArabic ? "دافئ 3000" : "Warm 3000",
            COOL_4000K: isArabic ? "بارد 4000" : "Cool 4000",
            WHITE_6500K: isArabic ? "أبيض 6500" : "White 6500",
        }
        const joiner = isArabic ? " ، " : ", "
        return temps
            .map((temp) => map[temp] || temp.replace(/_/g, " ").toLowerCase())
            .join(joiner)
    }

    const formatValue = (label: string, value: string | number | string[]) => {
        if (value === null || value === undefined || value === "") return ""

        const isArabic = locale.startsWith("ar")
        const joiner = isArabic ? " ، " : ", "

        if (Array.isArray(value)) {
            return value.map((v) => `${formatNumber(v)}K`).join(joiner)
        }

        const normalizedLabel = label.toLowerCase()

        if (["أقصى قوة كهربائية (w)", "maximum_wattage"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "وات" : "W"
            return `${formatNumber(value)} ${unit}`
        }

        if (["درجة الحماية القصوي", "maxip"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return formatNumber(value)
        }

        if (["درجة حرارة لون الاضاءة", "color_temperature", "color temperature"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return formatNumber(value)
        }

        if (["اللومن", "luminous_flux"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "لومن" : "lm"
            return `${formatNumber(value)} ${unit}`
        }
        if (["العمر الافتراضي", "life_time"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "ساعة" : "hours"
            return `${formatNumber(value)} ${unit}`
        }

        return Array.isArray(value) ? value.join(joiner) : value.toString()
    }

    const specEntries = Object.entries(product.specifications || {})
        .map(([label, value]) => {
            if (value === null || value === undefined || value === "") return null
            return { label, value: formatValue(label, value) }
        })
        .filter(Boolean) as Array<{ label: string; value: string | number }>
    if (product.colorTemperatures.length > 0) {
        const colorTempLabel = locale.startsWith("ar") ? "درجة حرارة لون الاضاءة" : "Color temperature"
        specEntries.push({
            label: colorTempLabel,
            value: formatColorTemps(product.colorTemperatures),
        })
    }

    const specifications = specEntries.sort((a, b) => {
        const ia = preferredOrder.indexOf(a.label as (typeof preferredOrder)[number])
        const ib = preferredOrder.indexOf(b.label as (typeof preferredOrder)[number])
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.label.localeCompare(b.label, "ar")
    })

    return (
        <main className="min-h-screen bg-background">
            <section className="py-24">
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
            <section ref={heroRef} className="pb-20 lg:pb-28">
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
                        <div className="space-y-4 col-span-2">
                            <div className="relative aspect-square bg-muted rounded-sm overflow-hidden">
                                {product.images.length > 0 ? (
                                    <Image
                                        src={product.images[selectedImageIndex] || product.images[0]}
                                        alt={productName}
                                        fill
                                        className="object-cover"
                                        priority
                                        quality={100}
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
                        <div className="space-y-8 lg:pt-4 col-span-3">
                            <div className="space-y-4">
                                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">{subCategoryName}</p>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-tight text-foreground leading-[1.1]">
                                    {productName}
                                </h1>
                                <div className="h-px w-16 bg-primary" />
                            </div>
                            {productDescription && (
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-muted-foreground font-light leading-relaxed text-base tracking-wide">
                                        {productDescription}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-baseline gap-2 py-6 border-y border-border">
                                <span className="text-lg font-light text-muted-foreground">{t("currency")}</span>
                                <span className="text-5xl md:text-6xl font-serif font-light tracking-tight text-foreground">
                                    {product.price.toLocaleString()}
                                </span>
                            </div>
                            {product.colorTemperatures.length > 0 && (
                                <ProductColorTempButtons
                                    productId={product.productId}
                                    availableTemps={product.colorTemperatures}
                                    initialTemp={selectedColorTemp}
                                    onColorTempChange={setSelectedColorTemp}
                                />
                            )}
                            {product.availableColors && product.availableColors.length > 0 && (
                                <ProductSurfaceColorButtons
                                    productId={product.productId}
                                    availableColors={product.availableColors}
                                    initialColor={surfaceColor}
                                    onSurfaceColorChange={setSurfaceColor}
                                />
                            )}
                        </div>
                    </div>
                </Container>
            </section>
            {specifications.length > 0 && (
                <section ref={specsRef} className="border-t border-border bg-secondary/20 py-24">
                    <Container>
                        <div className="mb-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light mb-4">
                                {t("technicalLabel")}
                            </p>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light tracking-tight text-foreground">
                                {t("specifications")}
                            </h2>
                            <div className="h-px w-16 bg-accent mt-4" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border border-border text-sm">
                                <tbody>
                                    {specifications.map((spec, index) => (
                                        <tr
                                            key={index}
                                            className="border-b border-border/70 hover:bg-secondary/40 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-muted-foreground font-light whitespace-nowrap">{spec.label}</td>
                                            <td className="px-4 py-3 text-foreground font-light">{spec.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Container>
                </section>
            )}
        </main>
    )
}