"use client"

import { useLocale, useTranslations } from "next-intl"
import { numericLocale, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/**
 * "There is a sale on, and it is on THESE products."
 *
 * A section banner exists because a discount that is only visible as a struck-through price on
 * a tile is a discount nobody came for. This is the one place on a listing that says the thing
 * out loud — and it is also the only saturated colour on the page, which is the Design Brief's
 * single deliberate risk: an editorial catalogue that whispers everything whispers this too.
 *
 * IT DISAPPEARS BY ITSELF. The caller passes `null` when nothing in the section is discounted,
 * and nothing in the section is discounted the moment the discount's window closes — so there
 * is no banner to take down, and no chance of one advertising a sale that ended on Tuesday.
 *
 * Every number is resolved server-side by `offers-service`, which reads the same resolver the
 * checkout does. "Up to" is exact, not marketing: a fixed-amount discount is a different
 * percentage on every product it touches, and this shows the best one.
 */

export interface OfferBannerProps {
    /** Best percentage actually taken off anything in this section. */
    percentOff: number
    productCount: number
    /** ISO. The soonest end among the discounts running here. */
    endsAt: string
    /** The section's name, in the reader's language. */
    section: string
    className?: string
}

export function OfferBanner({ percentOff, productCount, endsAt, section, className }: OfferBannerProps) {
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
        /*
         * `border-y` and no radius: this is a band across the page, not a card floating on it.
         * Logical padding only — `ps`/`pe` — so the Arabic layout mirrors without a second rule.
         */
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
