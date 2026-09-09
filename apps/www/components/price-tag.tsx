"use client"

import { formatMoney, type SerializedMoney } from "@repo/database"
import { useLocale, useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

export type PriceSize = "sm" | "md" | "lg" | "xl"

const SIZE: Record<PriceSize, { now: string; was: string }> = {
    sm: { now: "text-sm font-semibold", was: "text-xs" },
    md: { now: "text-lg font-semibold", was: "text-sm" },
    lg: { now: "text-2xl font-medium tracking-tight", was: "text-base" },
    xl: { now: "text-5xl md:text-6xl font-display font-light tracking-tight", was: "text-xl" },
}

interface PriceTagProps {
    price: SerializedMoney
    basePrice?: SerializedMoney | null
    size?: PriceSize
    className?: string
}

export function PriceTag({ price, basePrice, size = "lg", className }: PriceTagProps) {
    const locale = useLocale()
    const t = useTranslations("product-card")

    const discounted = Boolean(basePrice && basePrice !== price)
    const scale = SIZE[size]

    return (
        <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
            <span className={cn(scale.now, "text-foreground")}>{formatMoney(price ?? "0.00", locale)}</span>

            {discounted && (
                <span className={cn(scale.was, "text-muted-foreground")}>
                    <span className="sr-only">{t("was")} </span>
                    <span aria-hidden className="line-through">
                        {formatMoney(basePrice!, locale)}
                    </span>
                    <span className="sr-only">{formatMoney(basePrice!, locale)}</span>
                </span>
            )}
        </div>
    )
}

export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
    const locale = useLocale()
    const t = useTranslations("product-card")

    if (percent <= 0) return null

    const value = new Intl.NumberFormat(locale).format(percent)

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-sm bg-destructive px-2 py-1",
                "text-2xs font-bold tracking-label text-destructive-foreground uppercase",
                className
            )}
        >
            {value}%<span className="font-medium">{t("off")}</span>
        </span>
    )
}
