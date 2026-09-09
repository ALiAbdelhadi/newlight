"use client"

import { useLocale, useTranslations } from "next-intl"
import { numericLocale, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"

/**
 * The site-wide announcement strip.
 *
 * Rendered by the layout ONLY while something is actually discounted, so it is not a slot that
 * has to be emptied — the sale ending removes it, and the header returns to 64px on its own.
 *
 * INVERTED, NOT RED. The section banner already spends the page's one saturated colour; a
 * second red band stacked above it would be two alarms for one fact. `bg-foreground` /
 * `text-background` is the strongest contrast the token file can produce, it passes AA in both
 * themes by construction (they are the theme's own text and page colours), and it stays out of
 * the banner's way.
 *
 * NO DISMISS BUTTON, and that is a decision rather than an omission: dismissal is per-viewer
 * state, which means either a flash of a strip that then vanishes on hydration, or a header
 * height that changes after first paint. Both cost more than the strip does.
 */

export interface OffersBarProps {
    percentOff: number
    productCount: number
    endsAt: string
}

export function OffersBar({ percentOff, productCount, endsAt }: OffersBarProps) {
    const t = useTranslations("offers")
    /*
     * One digit system per surface. `ar` alone gives Latin digits in this runtime while the
     * prices beside this are Arabic-Indic, so both the percentage and the date go through
     * `numericLocale` — the same tag `formatMoney` uses (§4).
     */
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
                {/* The detail is the part a small screen can afford to lose; the offer is not. */}
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
