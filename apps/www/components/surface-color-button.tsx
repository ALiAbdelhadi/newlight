"use client";

import { changeProductAvailableColor } from "@/lib/surface-color";
import { cn } from "@/lib/utils";
import { AvailableColors } from "@repo/database";
import { Check, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useTransition } from "react";

const formatAvailableColor = (color: string, locale: string): string => {
    const isArabic = locale.startsWith("ar");
    const map: Record<string, string> = {
        BLACK: isArabic ? "أسود" : "Black",
        GRAY: isArabic ? "رمادي" : "Gray",
        WHITE: isArabic ? "أبيض" : "White",
        GOLD: isArabic ? "ذهبي" : "Gold",
        WOOD: isArabic ? "خشبي" : "Wood",
    };
    return map[color] || color.replace(/_/g, " ");
};

interface ProductSurfaceColorButtonsProps {
    productId: string;
    availableColors: string[];
    initialColor?: string;
    onSurfaceColorChange?: (newColor: string) => void;
}

export default function ProductSurfaceColorButtons({
    productId,
    availableColors,
    initialColor,
    onSurfaceColorChange,
}: ProductSurfaceColorButtonsProps) {
    const locale = useLocale();
    const [selectedColor, setSelectedColor] = useState<string>(
        initialColor || availableColors[0] || ""
    );
    const [isPending, startTransition] = useTransition();

    const handleColorChange = async (color: string) => {
        setSelectedColor(color);
        onSurfaceColorChange?.(color);

        startTransition(async () => {
            try {
                await changeProductAvailableColor({
                    productId,
                    newAvailableColor: color as AvailableColors,
                });
            } catch (error) {
                console.error("Failed to update surface color:", error);
                setSelectedColor(initialColor || availableColors[0] || "");
            }
        });
    };

    if (availableColors.length === 0) return null;

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { bg: string; border: string; ring: string; checkColor: string }> = {
            BLACK: {
                bg: "bg-black",
                border: "border-gray-900",
                ring: "ring-gray-700",
                checkColor: "text-white"
            },
            GRAY: {
                bg: "bg-gradient-to-br from-gray-400 to-gray-600",
                border: "border-gray-500",
                ring: "ring-gray-500",
                checkColor: "text-white"
            },
            WHITE: {
                bg: "bg-gradient-to-br from-gray-50 to-white",
                border: "border-gray-300",
                ring: "ring-gray-300",
                checkColor: "text-gray-900"
            },
            GOLD: {
                bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600",
                border: "border-yellow-600",
                ring: "ring-yellow-500",
                checkColor: "text-white"
            },
            WOOD: {
                bg: "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800",
                border: "border-amber-700",
                ring: "ring-amber-600",
                checkColor: "text-white"
            },
        };
        return colorMap[color] || {
            bg: "bg-gradient-to-br from-gray-200 to-gray-300",
            border: "border-gray-400",
            ring: "ring-gray-400",
            checkColor: "text-gray-900"
        };
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                            {locale.startsWith("ar") ? "الألوان المتاحة" : "Available Colors"}
                        </p>
                        {isPending && (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                {availableColors.map((color) => {
                    const isSelected = selectedColor === color;
                    const colorClasses = getColorClasses(color);
                    return (
                        <button
                            key={color}
                            onClick={() => handleColorChange(color)}
                            disabled={isPending}
                            className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={formatAvailableColor(color, locale)}
                        >
                            <div
                                className={cn(
                                    "absolute -inset-1 rounded-full transition-all duration-300",
                                    isSelected
                                        ? `${colorClasses.ring} ring-2 ring-offset-2 ring-offset-background opacity-100`
                                        : "opacity-0 group-hover:opacity-50"
                                )}
                            />
                            <div
                                className={cn(
                                    "flex items-center justify-center cursor-pointer relative w-7 h-7 rounded-full shadow-md border-2 transition-all duration-300",
                                    colorClasses.bg,
                                    colorClasses.border,
                                    isSelected
                                        ? "scale-110 shadow-lg"
                                        : "group-hover:scale-105 group-hover:shadow-lg"
                                )}
                            >
                                <div
                                    className={cn(
                                        "transition-all duration-300",
                                        isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
                                    )}
                                >
                                    <Check
                                        className={cn("w-4 h-4 drop-shadow-sm", colorClasses.checkColor)}
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <div className="absolute inset-0 rounded-full bg-border opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                            </div>
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span className={cn(
                                    "text-xs font-light tracking-wide transition-opacity duration-300",
                                    isSelected ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-70 text-muted-foreground"
                                )}>
                                    {formatAvailableColor(color, locale)}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}