"use client"

import { useLocale } from "next-intl"
import { useState } from "react"

import { Swatch } from "@/components/swatch"
import { cn } from "@/lib/utils"

const formatAvailableColor = (color: string, locale: string): string => {
    const isArabic = locale.startsWith("ar")
    const map: Record<string, string> = {
        BLACK: isArabic ? "أسود" : "Black",
        GRAY: isArabic ? "رمادي" : "Gray",
        WHITE: isArabic ? "أبيض" : "White",
        GOLD: isArabic ? "ذهبي" : "Gold",
        WOOD: isArabic ? "خشبي" : "Wood",
    }
    return map[color] || color.replace(/_/g, " ")
}

interface ProductSurfaceColorButtonsProps {
    availableColors: string[]
    initialColor?: string
    onSurfaceColorChange?: (newColor: string) => void
}

/**
 * The finish picker on a product page.
 *
 * The sample itself is `components/swatch.tsx` now — this owns the choosing, not the drawing.
 * Two things went out with the local copy of the palette:
 *
 *   SIX SELECTION RINGS, one per finish (`ring-gray-700`, `ring-yellow-500`, `ring-amber-600`, …).
 *   Selection is a state, and this application has exactly one colour for it: `--ring`. A gold
 *   lamp being selected does not mean something different from a black one being selected.
 *
 *   AN UNLABELLED CHOICE. The finish's name only appeared on hover, so on a touch screen — where
 *   there is no hover — the control was five coloured dots and no way to learn what any of them
 *   was without picking it. The selected finish is named in text now, always, and the per-swatch
 *   label stays as the pointer's affordance.
 */
export default function ProductSurfaceColorButtons({
    availableColors,
    initialColor,
    onSurfaceColorChange,
}: ProductSurfaceColorButtonsProps) {
    const locale = useLocale()
    const [selectedColorKey, setSelectedColor] = useState<string>(
        initialColor || availableColors[0] || ""
    )

    const handleColorChange = (color: string) => {
        setSelectedColor(color)
        onSurfaceColorChange?.(color)
    }

    if (availableColors.length === 0) return null

    return (
        <div className="space-y-4">
            <p className="text-sm uppercase tracking-label text-muted-foreground font-light">
                {locale.startsWith("ar") ? "الألوان المتاحة" : "Available Colors"}
                {selectedColorKey && (
                    <span className="ms-2 text-foreground">
                        {formatAvailableColor(selectedColorKey, locale)}
                    </span>
                )}
            </p>

            <div className="flex flex-wrap gap-3">
                {availableColors.map((color) => {
                    const isSelected = selectedColorKey === color

                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => handleColorChange(color)}
                            aria-pressed={isSelected}
                            aria-label={formatAvailableColor(color, locale)}
                            className="group relative cursor-pointer"
                        >
                            <Swatch
                                value={color}
                                kind="surface"
                                size="lg"
                                selected={isSelected}
                                className={cn(
                                    "shadow-overlay transition-[scale,box-shadow] duration-(--duration-base) ease-out-fast",
                                    isSelected
                                        ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                                        : "group-hover:scale-105"
                                )}
                            />

                            <span
                                aria-hidden
                                className={cn(
                                    "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
                                    "text-xs font-light text-muted-foreground",
                                    "opacity-0 transition-opacity duration-(--duration-base) ease-out-fast",
                                    "group-hover:opacity-100"
                                )}
                            >
                                {formatAvailableColor(color, locale)}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
