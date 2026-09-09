"use client"

import { useLocale, useTranslations } from "next-intl"
import { numericLocale, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"

export interface OffersBarProps {
    percentOff: number
    productCount: number
    endsAt: string
}

export function OffersBar({ percentOff, productCount, endsAt }: OffersBarProps) {
    const t = useTranslations("offers")
    const tag = numericLocale(resolveLocale(useLocale()))
    const percent = new Intl.NumberFormat(tag).format(percentOff)
    const ends = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long" }).format(new Date(endsAt))

    return (
        <div className="fixed inset-x-0 top-0 z-50 h-(--announcement-height) bg-foreground text-background">
            <Link
                href="/offers"
                className="flex h-full items-center justify-center gap-2 px-(--gutter) text-center text-xs font-medium tracking-wide"
            >
                <span>{t("barTitle", { percent })}</span>
                <span className="hidden text-background/70 sm:inline">
                    {t("barMeta", {
                        count: productCount,
                        formattedCount: new Intl.NumberFormat(tag).format(productCount),
                        date: ends,
                    })}
                </span>
                <span className="underline underline-offset-2">{t("seeAll")}</span>
            </Link>
        </div>
    )
}
