"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"
import { useLocale } from "next-intl"


const formatColorTemp = (temp: string, locale: string): string => {
    const isArabic = locale.startsWith("ar")
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
        COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
        WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
    }
    return map[temp] || temp.replace(/_/g, " ")
}

interface CartColorTempSelectorProps {
    productId: string;
    availableTemps: string[]
    selectedTemp: string | null
    onChange: (temp: string) => void
    disabled?: boolean
}

export function CartColorTempSelector({
    productId,
    availableTemps,
    selectedTemp,
    onChange,
    disabled = false,
}: CartColorTempSelectorProps) {
    const locale = useLocale()

    if (!availableTemps || availableTemps.length === 0) return null

    const getTempColor = (temp: string) => {
        const isWarm = temp === "WARM_3000K"
        const isCool = temp === "COOL_4000K"
        const isWhite = temp === "WHITE_6500K"

        if (isWarm) return "bg-gradient-to-br from-yellow-300 to-yellow-400 border-yellow-400"
        if (isCool) return "bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-200"
        if (isWhite) return "bg-gradient-to-br from-gray-50 to-white border-gray-300"
        return "bg-gradient-to-br from-gray-200 to-gray-300 border-gray-400"
    }

    const currentTemp = selectedTemp || availableTemps[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || availableTemps.length === 1}
                    className="h-7 text-xs gap-1.5 px-2 w-full justify-between"
                >
                    <div className="flex items-center gap-1.5">
                        <div
                            className={cn(
                                "w-3 h-3 rounded-full border-2",
                                getTempColor(currentTemp)
                            )}
                        />
                        <span className="truncate">{formatColorTemp(currentTemp, locale)}</span>
                    </div>
                    {availableTemps.length > 1 && (
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            {availableTemps.length > 1 && (
                <DropdownMenuContent align="start" className="w-[200px]">
                    {availableTemps.map((temp) => (
                        <DropdownMenuItem
                            key={temp}
                            onClick={() => onChange(temp)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center gap-2 w-full">
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                        getTempColor(temp)
                                    )}
                                >
                                    {currentTemp === temp && (
                                        <Check className="w-3 h-3 text-gray-700" strokeWidth={2.5} />
                                    )}
                                </div>
                                <span className="text-sm">{formatColorTemp(temp, locale)}</span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    )
}

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

interface CartSurfaceColorSelectorProps {
    availableColors: string[]
    selectedColor: string | null
    onChange: (color: string) => void
    disabled?: boolean
}

export function CartSurfaceColorSelector({
    availableColors,
    selectedColor,
    onChange,
    disabled = false,
}: CartSurfaceColorSelectorProps) {
    const locale = useLocale()

    if (!availableColors || availableColors.length === 0) return null

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { bg: string; border: string; checkColor: string }> = {
            BLACK: {
                bg: "bg-black",
                border: "border-gray-900",
                checkColor: "text-white",
            },
            GRAY: {
                bg: "bg-gradient-to-br from-gray-400 to-gray-600",
                border: "border-gray-500",
                checkColor: "text-white",
            },
            WHITE: {
                bg: "bg-gradient-to-br from-gray-50 to-white",
                border: "border-gray-300",
                checkColor: "text-gray-900",
            },
            GOLD: {
                bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600",
                border: "border-yellow-600",
                checkColor: "text-white",
            },
            WOOD: {
                bg: "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800",
                border: "border-amber-700",
                checkColor: "text-white",
            },
        }
        return (
            colorMap[color] || {
                bg: "bg-gradient-to-br from-gray-200 to-gray-300",
                border: "border-gray-400",
                checkColor: "text-gray-900",
            }
        )
    }

    const currentColor = selectedColor || availableColors[0]
    const colorClasses = getColorClasses(currentColor)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || availableColors.length === 1}
                    className="h-7 text-xs gap-1.5 px-2 w-full justify-between"
                >
                    <div className="flex items-center gap-1.5">
                        <div
                            className={cn(
                                "w-3 h-3 rounded-full border-2",
                                colorClasses.bg,
                                colorClasses.border
                            )}
                        />
                        <span className="truncate">{formatAvailableColor(currentColor, locale)}</span>
                    </div>
                    {availableColors.length > 1 && (
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            {availableColors.length > 1 && (
                <DropdownMenuContent align="start" className="w-[180px]">
                    {availableColors.map((color) => {
                        const classes = getColorClasses(color)
                        return (
                            <DropdownMenuItem
                                key={color}
                                onClick={() => onChange(color)}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                            classes.bg,
                                            classes.border
                                        )}
                                    >
                                        {currentColor === color && (
                                            <Check
                                                className={cn("w-3 h-3", classes.checkColor)}
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </div>
                                    <span className="text-sm">{formatAvailableColor(color, locale)}</span>
                                </div>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    )
}