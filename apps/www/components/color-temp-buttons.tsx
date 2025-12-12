"use client";

import { Button } from "@/components/ui/button";
import { changeProductColorTemp } from "@/lib/product-temp";
import { cn } from "@/lib/utils";
import { ProductColorTemp } from "@repo/database";
import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useTransition } from "react";

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
    const [selectedTemp, setSelectedTemp] = useState<string>(
        initialTemp || availableTemps[0] || ""
    );
    const [isPending, startTransition] = useTransition();

    const handleColorTempChange = async (colorTemp: string) => {
        // Update UI immediately (optimistic update)
        setSelectedTemp(colorTemp);
        onColorTempChange?.(colorTemp);

        // Update database in background
        startTransition(async () => {
            try {
                await changeProductColorTemp({
                    productId,
                    newColorTemp: colorTemp as ProductColorTemp,
                });
            } catch (error) {
                console.error("Failed to update color temperature:", error);
                // Revert on error
                setSelectedTemp(initialTemp || availableTemps[0] || "");
            }
        });
    };

    if (availableTemps.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <p className="text-sm uppercase tracking-widest text-muted-foreground font-light">
                    {locale.startsWith("ar") ? "درجة حرارة اللون" : "Color Temperature"}
                </p>
                {isPending && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {availableTemps.map((temp) => {
                    const isSelected = selectedTemp === temp;
                    return (
                        <Button
                            key={temp}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleColorTempChange(temp)}
                            disabled={isPending}
                            className={cn(
                                "px-4 py-2 rounded-sm text-sm font-light tracking-wide transition-all",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-background hover:bg-secondary",
                                isPending && "opacity-50 cursor-not-allowed"
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