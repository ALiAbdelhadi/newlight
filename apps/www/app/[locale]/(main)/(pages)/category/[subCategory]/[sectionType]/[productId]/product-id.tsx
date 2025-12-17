"use client"

import { addToCart } from "@/actions/cart"
import ProductColorTempButtons from "@/components/color-temp-buttons"
import { Container } from "@/components/container"
import ProductSurfaceColorButtons from "@/components/surface-color-button"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { Product } from "@/types"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ChevronRight, Minus, Plus, ShoppingCart } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

gsap.registerPlugin(ScrollTrigger)

interface ProductIdPageProps {
    product: Product
}

export default function ProductIdPage({ product }: ProductIdPageProps) {
    const t = useTranslations("product-page")
    const locale = useLocale()
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [selectedColorTemp, setSelectedColorTemp] = useState<string>(product.colorTemperatures[0] || "")
    const [surfaceColor, setSurfaceColor] = useState<string>(product.availableColors[0] || "")
    const [quantity, setQuantity] = useState(1)
    const [isAddingToCart, setIsAddingToCart] = useState(false)

    const heroRef = useRef<HTMLElement>(null)
    const specsRef = useRef<HTMLElement>(null)

    const productTranslation = product.translations[0]
    const subCategoryTranslation = product.subCategory.translations[0]
    const categoryTranslation = product.subCategory.category.translations[0]

    const productName = productTranslation?.name || product.productId
    const productDescription = productTranslation?.description
    const subCategoryName = subCategoryTranslation?.name || product.subCategory.slug
    const categoryName = categoryTranslation?.name || product.subCategory.category.categoryType

    const handleAddToCart = async () => {
        setIsAddingToCart(true)
        try {
            await addToCart(product.productId, quantity, selectedColorTemp, surfaceColor)
            toast.success(t("addedToCart"), {
                description: `${productName} ${t("addedToCart").toLowerCase()}`,
            })
        } catch (error) {
            console.error("Failed to add to cart", error)
            toast.error("Error", {
                description: "Failed to add to cart",
            })
        } finally {
            setIsAddingToCart(false)
        }
    }

    const handleOrderNow = async () => {
        await handleAddToCart()
        window.location.href = `/${locale}/cart`
    }

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

    // دالة لترجمة الألوان - تحول BLACK إلى "أسود" أو "Black"
    const formatAvailableColor = (color: string, isArabic: boolean): string => {
        const map: Record<string, string> = {
            BLACK: isArabic ? "أسود" : "Black",
            GRAY: isArabic ? "رمادي" : "Gray",
            WHITE: isArabic ? "أبيض" : "White",
            GOLD: isArabic ? "ذهبي" : "Gold",
            WOOD: isArabic ? "خشبي" : "Wood",
        }
        return map[color] || color.replace(/_/g, " ")
    }

    // Function to convert snake_case or camelCase to readable format
    const formatLabel = (label: string, isArabic: boolean): string => {
        // If Arabic, return as is
        if (isArabic) {
            return label
        }

        // Special handling for IP-related labels
        const lowerLabel = label.toLowerCase()
        if (lowerLabel === "ip" || lowerLabel === "ip_rating" || lowerLabel === "iprating") {
            return "IP"
        }
        if (lowerLabel === "maxip" || lowerLabel === "max_ip" || lowerLabel === "maxiprating") {
            return "Max IP"
        }

        // For English, convert to readable format
        return label
            .replace(/_/g, " ") // Replace underscores with spaces
            .replace(/([A-Z])/g, " $1") // Add space before capital letters
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ")
            .trim()
    }

    // Preferred order for specifications display
    const preferredOrder = [
        "input",
        "المدخل",
        "voltage",
        "الفولت",
        "maximum_wattage",
        "أقصى قوة كهربائية",
        "brand_of_led",
        "علامة الليد التجارية",
        "luminous_flux",
        "اللومن",
        "main_material",
        "مادة التصنيع",
        "cri",
        "مؤشر تجسيد الألوان",
        "beam_angle",
        "زاوية الإضاءة",
        "working_temperature",
        "درجة حرارة التشغيل",
        "fixture_dimmable",
        "قابل للتعتيم",
        "electrical",
        "الكهرباء",
        "driver",
        "المحرك",
        "power_factor",
        "معامل القدرة",
        "color_temperature",
        "درجة حرارة اللون",
        "ip_rating",
        "درجة الحماية",
        "ip",
        "maxip",
        "أقصى درجة حماية",
        "energy_saving",
        "توفير الطاقة",
        "life_time",
        "العمر الافتراضي",
        "product_dimensions",
        "أبعاد المنتج",
        "hole_size",
        "حجم الفتحة",
        "surface_color",
        "لون السطح",
        "available_colors",
        "الالوان المتوفرة",
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
            WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
            COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
            WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
        }
        const joiner = isArabic ? " / " : " / "
        return temps.map((temp) => map[temp] || temp.replace(/_/g, " ").toLowerCase()).join(joiner)
    }

    const formatValue = (label: string, value: string | number | string[]) => {
        if (value === null || value === undefined || value === "") return ""

        const isArabic = locale.startsWith("ar")
        const joiner = isArabic ? " ، " : ", "

        // Handle arrays differently based on label
        if (Array.isArray(value)) {
            const normalizedLabel = label.toLowerCase()

            // Check if it's color-related (surface_color, available_colors, etc.)
            if (
                ["surface_color", "لون السطح", "available_colors", "الالوان المتوفرة", "color"].some((l) =>
                    normalizedLabel.includes(l.toLowerCase()),
                )
            ) {
                // ترجمة الألوان
                return value.map(color => formatAvailableColor(color, isArabic)).join(joiner)
            }

            // For other arrays (like color temperatures in array format), add K
            return value.map((v) => `${formatNumber(v)}K`).join(joiner)
        }

        const normalizedLabel = label.toLowerCase()

        // Check if it's a surface color or available colors field - translate the color
        if (
            ["surface_color", "لون السطح", "available_colors", "الالوان المتوفرة"].some((l) =>
                normalizedLabel.includes(l.toLowerCase()),
            )
        ) {
            return formatAvailableColor(value.toString(), isArabic)
        }

        if (["أقصى قوة كهربائية", "maximum_wattage", "wattage"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "وات" : "W"
            return `${formatNumber(value)} ${unit}`
        }

        if (["درجة الحماية القصوي", "maxip", "max_ip"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return formatNumber(value)
        }

        if (["درجة حرارة اللون", "color_temperature"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return value.toString()
        }

        if (["اللومن", "luminous_flux", "luminous flux"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "لومن" : "lm"
            return `${formatNumber(value)} ${unit}`
        }

        if (["العمر الافتراضي", "life_time", "lifetime"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            const unit = isArabic ? "ساعة" : "hours"
            return `${formatNumber(value)} ${unit}`
        }

        if (["زاوية الإضاءة", "beam_angle"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return `${formatNumber(value)}°`
        }

        if (["توفير الطاقة", "energy_saving"].some((l) => normalizedLabel.includes(l.toLowerCase()))) {
            return `${formatNumber(value)}%`
        }

        return value.toString()
    }

    const isArabic = locale.startsWith("ar")

    // Create a map to track which specs have been added to avoid duplicates
    const addedSpecs = new Map<string, boolean>()

    const specEntries = Object.entries(product.specifications || {})
        .map(([label, value]) => {
            if (value === null || value === undefined || value === "") return null

            const normalizedLabel = label.toLowerCase().replace(/[_\s]/g, "")

            // Skip if this is a color_temperature field and we already have color temperatures
            if (
                (normalizedLabel.includes("colortemperature") || normalizedLabel.includes("colourtemperature")) &&
                product.colorTemperatures.length > 0
            ) {
                return null
            }

            return {
                originalLabel: label,
                label: formatLabel(label, isArabic),
                value: formatValue(label, value),
            }
        })
        .filter(Boolean) as Array<{ originalLabel: string; label: string; value: string | number }>

    // Only add color temperatures if they exist and haven't been added yet
    if (product.colorTemperatures.length > 0) {
        const colorTempLabel = isArabic ? "درجة حرارة اللون" : "Color Temperature"
        specEntries.push({
            originalLabel: "color_temperature",
            label: colorTempLabel,
            value: formatColorTemps(product.colorTemperatures),
        })
    }

    const specifications = specEntries.sort((a, b) => {
        const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, "_")

        const ia = preferredOrder.findIndex(
            (order) => normalizeKey(order) === normalizeKey(a.originalLabel) || normalizeKey(order) === normalizeKey(a.label),
        )
        const ib = preferredOrder.findIndex(
            (order) => normalizeKey(order) === normalizeKey(b.originalLabel) || normalizeKey(order) === normalizeKey(b.label),
        )

        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.label.localeCompare(b.label, isArabic ? "ar" : "en")
    })

    const isOutOfStock = product.inventory <= 0

    return (
        <main className="min-h-screen bg-background">
            <section className="py-24">
                <Container>
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
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

                            <div className="space-y-6 pt-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-light">
                                            {t("quantity")}
                                        </span>
                                        <div className="flex items-center border border-border rounded-sm">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-none hover:bg-secondary"
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                disabled={isOutOfStock}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-12 text-center font-light tabular-nums">{quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-none hover:bg-secondary"
                                                onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                                                disabled={isOutOfStock}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {isOutOfStock && <span className="text-sm text-destructive font-light">{t("outOfStock")}</span>}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button
                                        onClick={handleAddToCart}
                                        disabled={isAddingToCart || isOutOfStock}
                                        className="flex-1 h-14 text-base uppercase tracking-[0.2em] font-light rounded-sm bg-transparent"
                                        variant="outline"
                                    >
                                        <ShoppingCart className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                        {isAddingToCart ? t("addingToCart") : t("addToCart")}
                                    </Button>
                                    <Button
                                        onClick={handleOrderNow}
                                        disabled={isAddingToCart || isOutOfStock}
                                        className="flex-1 h-14 text-base uppercase tracking-[0.2em] font-light rounded-sm"
                                    >
                                        {t("orderNow")}
                                    </Button>
                                </div>
                            </div>
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
                                        <tr key={index} className="border-b border-border/70 hover:bg-secondary/40 transition-colors">
                                            <td className="py-4 px-6 font-light text-muted-foreground uppercase tracking-[0.15em] text-xs w-1/3">
                                                {spec.label}
                                            </td>
                                            <td className="py-4 px-6 font-light text-foreground text-base">{spec.value}</td>
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