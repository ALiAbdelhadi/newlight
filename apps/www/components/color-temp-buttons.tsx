"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "./ui/button";

const formatColorTemp = (temp: string, locale: string): string => {
    const isArabic = locale.startsWith("ar");
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
        COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
        WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
    };
    return map[temp] || temp.replace(/_/g, " ");
};

interface ProductColorTempButtonsProps {
    productId: string;
    availableTemps: string[];
    initialTemp?: string;
    onColorTempChange?: (newTemp: string) => void;
}

export default function ProductColorTempButtons({
    productId,
    availableTemps,
    initialTemp,
    onColorTempChange,
}: ProductColorTempButtonsProps) {
    const locale = useLocale();
    const [selectedTemp, setSelectedTemp] = useState<string>(
        initialTemp || availableTemps[0] || ""
    );

    const handleTempChange = (temp: string) => {
        setSelectedTemp(temp);
        onColorTempChange?.(temp);
    };

    if (availableTemps.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                            {locale.startsWith("ar") ? "درجة حرارة اللون" : "Color Temperature"}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                {availableTemps.map((temp) => {
                    const isSelected = selectedTemp === temp;
                    const isWarm = temp === "WARM_3000K";
                    const isCool = temp === "COOL_4000K";
                    const isWhite = temp === "WHITE_6500K";

                    return (
                        <Button
                            key={temp}
                            variant="outline"
                            onClick={() => handleTempChange(temp)}
                            className={cn(
                                "group relative transition-all duration-300",
                                isSelected
                                    ? "border-accent bg-accent/10 scale-105 shadow-md"
                                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                            )}
                            aria-label={formatColorTemp(temp, locale)}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 shadow-sm transition-all duration-300",
                                        isWarm && "bg-linear-to-br from-yellow-300 to-yellow-400 border-yellow-400",
                                        isCool && "bg-linear-to-br from-yellow-100 to-yellow-200 border-yellow-200",
                                        isWhite && "bg-linear-to-br from-gray-50 to-white border-gray-300",
                                        isSelected ? "scale-110" : "group-hover:scale-105"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
                                        </div>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-sm font-light tracking-wide transition-colors duration-300",
                                        isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                >
                                    {formatColorTemp(temp, locale)}
                                </span>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}