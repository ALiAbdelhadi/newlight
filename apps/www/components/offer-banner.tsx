"use client"

import { useLocale, useTranslations } from "next-intl"
import { numericLocale, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export interface OfferBannerProps {
    percentOff: number
    productCount: number
    endsAt: string
    section: string
    className?: string
}

export function OfferBanner({ percentOff, productCount, endsAt, section, className }: OfferBannerProps) {
    const t = useTranslations("offers")
    const tag = numericLocale(resolveLocale(useLocale()))
    const percent = new Intl.NumberFormat(tag).format(percentOff)
    const ends = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long" }).format(new Date(endsAt))

    return (
        <aside
            aria-label={t("bannerLabel")}
            className={cn(
                "border-y border-danger-border bg-danger-bg",
                "flex flex-wrap items-baseline gap-x-4 gap-y-1 px-(--gutter) py-4 lg:px-(--gutter-lg)",
                className
            )}
        >
            <p className="font-display text-2xl leading-tight text-danger italic md:text-3xl">
                {t("bannerTitle", { percent, section })}
            </p>

            <p className="text-sm text-muted-foreground">
                {t("bannerMeta", {
                    count: productCount,
                    formattedCount: new Intl.NumberFormat(tag).format(productCount),
                    date: ends,
                })}
            </p>

            <Link
                href="/offers"
                className={cn(
                    "ms-auto text-sm font-medium underline underline-offset-4",
                    "transition-colors duration-(--duration-fast) hover:text-danger"
                )}
            >
                {t("seeAll")}
            </Link>
        </aside>
    )
}
