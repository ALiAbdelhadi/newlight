"use client"

import { useLocale } from "next-intl"
import { useState } from "react"

import { Swatch } from "@/components/swatch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const formatColorTemp = (temp: string, locale: string): string => {
    const isArabic = locale.startsWith("ar")
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
        COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
        WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
    }
    return map[temp] || temp.replace(/_/g, " ")
}

interface ProductColorTempButtonsProps {
    availableTemps: string[]
    initialTemp?: string
    onColorTempChange?: (newTemp: string) => void
}

export default function ProductColorTempButtons({
    availableTemps,
    initialTemp,
    onColorTempChange,
}: ProductColorTempButtonsProps) {
    const locale = useLocale()
    const [selectedTemp, setSelectedTemp] = useState<string>(initialTemp || availableTemps[0] || "")

    const handleTempChange = (temp: string) => {
        setSelectedTemp(temp)
        onColorTempChange?.(temp)
    }

    if (availableTemps.length === 0) return null

    return (
        <div className="space-y-4">
            <p className="text-sm uppercase tracking-label text-muted-foreground font-light">
                {locale.startsWith("ar") ? "درجة حرارة اللون" : "Color Temperature"}
            </p>

            <div className="flex flex-wrap gap-3">
                {availableTemps.map((temp) => {
                    const isSelected = selectedTemp === temp

                    return (
                        <Button
                            key={temp}
                            type="button"
                            variant="outline"
                            aria-pressed={isSelected}
                            onClick={() => handleTempChange(temp)}
                            className={cn(
                                "w-full gap-2 transition-colors duration-(--duration-fast) md:w-fit",
                                isSelected
                                    ? "border-primary bg-primary-soft text-foreground"
                                    : "hover:bg-accent"
                            )}
                        >
                            <Swatch value={temp} kind="temperature" selected={isSelected} />
                            {formatColorTemp(temp, locale)}
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
