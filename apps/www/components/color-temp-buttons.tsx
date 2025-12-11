"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { useState, useEffect } from "react";

const formatColorTemp = (temp: string, locale: string): string => {
    const isArabic = locale.startsWith("ar");
    const map: Record<string, string> = {
        WARM_3000K: isArabic ? "دافئ 3000" : "Warm 3000",
        COOL_4000K: isArabic ? "بارد 4000" : "Cool 4000",
        WHITE_6500K: isArabic ? "أبيض 6500" : "White 6500",
    };
    return map[temp] || temp.replace(/_/g, " ").replace(/K/g, "");
};

interface ProductColorTempButtonsProps {
    productId: string;
    availableTemps: string[];
    initialTemp?: string;
    onColorTempChange?: (newColorTemp: string) => void;
}

export default function ProductColorTempButtons({
    productId,
    availableTemps,
    initialTemp,
    onColorTempChange,
}: ProductColorTempButtonsProps) {
    const locale = useLocale();
    
    const storageKey = `product-${productId}-color-temp`;
    
    const [selectedTemp, setSelectedTemp] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(storageKey);
            if (saved && availableTemps.includes(saved)) {
                return saved;
            }
        }
        return initialTemp || availableTemps[0] || "";
    });
    useEffect(() => {
        if (selectedTemp && typeof window !== "undefined") {
            localStorage.setItem(storageKey, selectedTemp);
        }
    }, [selectedTemp, storageKey]);

    useEffect(() => {
        if (initialTemp && availableTemps.includes(initialTemp) && initialTemp !== selectedTemp) {
            setSelectedTemp(initialTemp);
        } else if (availableTemps.length > 0 && !availableTemps.includes(selectedTemp)) {
            setSelectedTemp(availableTemps[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTemp, availableTemps]);

    const handleColorTempChange = (colorTemp: string) => {
        setSelectedTemp(colorTemp);
        onColorTempChange?.(colorTemp);
    };

    if (availableTemps.length === 0) return null;

    return (
        <div className="space-y-3">
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                {locale.startsWith("ar") ? "درجة حرارة اللون" : "Color Temperature"}
            </p>
            <div className="flex flex-wrap gap-2">
                {availableTemps.map((temp) => {
                    const isSelected = selectedTemp === temp;
                    return (
                        <Button
                            key={temp}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleColorTempChange(temp)}
                            className={cn(
                                "px-4 py-2 rounded-sm text-sm font-light tracking-wide transition-all",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-background hover:bg-secondary",
                            )}
                        >
                            {formatColorTemp(temp, locale)}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
