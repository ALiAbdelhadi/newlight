"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "./ui/button"

interface ProductVariant {
    id: string
    productId: string
    slug: string
    variantType: string | null
    variantValue: string | null
    price: number
    inventory: number
    name: string
}

interface ProductVariantsSelectorProps {
    currentProductId: string
    variants: ProductVariant[]
    categorySlug: string
    subCategorySlug: string
}

export default function ProductVariantsSelector({
    currentProductId,
    variants,
    categorySlug,
    subCategorySlug,
}: ProductVariantsSelectorProps) {
    const locale = useLocale()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedVariant, setSelectedVariant] = useState(currentProductId)

    if (!variants || variants.length <= 1) {
        return null
    }

    const handleVariantChange = (variant: ProductVariant) => {
        setSelectedVariant(variant.productId)

        startTransition(() => {
            const newUrl = `/${locale}/category/${categorySlug}/${subCategorySlug}/${variant.productId}`
            router.replace(newUrl, { scroll: false })
        })
    }

    const formatVariantLabel = (variant: ProductVariant): string => {
        const isArabic = locale.startsWith("ar")

        if (!variant.variantValue) {
            return variant.name
        }

        const value = variant.variantValue.toUpperCase()

        if (variant.variantType === "wattage") {
            return value
        } else if (variant.variantType === "length") {
            return value
        } else if (variant.variantType === "voltage") {
            return value
        }

        return value
    }

    const getVariantTypeLabel = (variantType: string | null): string => {
        if (!variantType) return ""

        const isArabic = locale.startsWith("ar")
        const labels: Record<string, { en: string; ar: string }> = {
            wattage: { en: "Power", ar: "القوة" },
            length: { en: "Length", ar: "الطول" },
            voltage: { en: "Voltage", ar: "الفولت" },
        }

        return labels[variantType]?.[isArabic ? "ar" : "en"] || variantType
    }

    const variantType = variants[0]?.variantType
    const typeLabel = getVariantTypeLabel(variantType)

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                    {typeLabel}
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                {variants.map((variant) => {
                    const isSelected = selectedVariant === variant.productId
                    const isOutOfStock = variant.inventory <= 0
                    const label = formatVariantLabel(variant)

                    return (
                        <Button
                            key={variant.id}
                            variant="outline"
                            onClick={() => !isOutOfStock && handleVariantChange(variant)}
                            disabled={isOutOfStock || isPending}
                            className={cn(
                                "group relative transition-all duration-300 min-w-[80px]",
                                isSelected
                                    ? "border-accent bg-accent/10 scale-105 shadow-md"
                                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span
                                    className={cn(
                                        "text-sm font-light tracking-wide transition-colors",
                                    )}
                                >
                                    {label}
                                </span>
                                {isSelected && (
                                    <Check className="w-4 h-4 text-green-500" strokeWidth={2.5} />
                                )}
                            </div>
                            {isOutOfStock && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-sm">
                                    <span className="text-xs text-muted-foreground font-light">
                                        {locale.startsWith("ar") ? "غير متوفر" : "Out of Stock"}
                                    </span>
                                </div>
                            )}
                            {variant.price !== variants[0].price && (
                                <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-sm">
                                    {variant.price.toLocaleString()}
                                </div>
                            )}
                        </Button>
                    )
                })}
            </div>
            {isPending && (
                <div className="text-sm text-muted-foreground font-light animate-pulse">
                    {locale.startsWith("ar") ? "جاري التحديث..." : "Updating..."}
                </div>
            )}
        </div>
    )
}