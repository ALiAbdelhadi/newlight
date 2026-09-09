"use client"

import { formatMoney, type SerializedMoney } from "@repo/database"
import { useLocale, useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * THE price, wherever a price is shown.
 *
 * Discounts (§13.2, migration 0015) gave every price tag a second state — "was 1000, now 850" —
 * and there are six surfaces that render one: the tile, the product page, the variant strip,
 * the search result, the cart row and the order preview. Six hand-written struck-through spans
 * is six chances for the sale price to be the struck one, or for the Arabic layout to put the
 * currency on the wrong side of the number.
 *
 * Two rules it exists to hold:
 *
 *   THE PROMINENT NUMBER IS ALWAYS WHAT THE CUSTOMER PAYS. `price` is the effective price all
 *   the way from the resolver, so a component cannot accidentally lead with the base one.
 *
 *   THE STRUCK NUMBER IS NOT READ AS THE PRICE. A screen reader announcing "one thousand, eight
 *   hundred and fifty" leaves a blind customer with two numbers and no idea which one is due,
 *   so the old price is introduced by a real word ("Was") rather than by a line through it —
 *   `line-through` is a visual convention with no accessible equivalent.
 *
 * RTL is handled by not choosing a side: this is flex with a gap, no `left`, no `right`, and
 * `formatMoney` already places the currency per locale (before in English, after in Arabic).
 */

export type PriceSize = "sm" | "md" | "lg" | "xl"

const SIZE: Record<PriceSize, { now: string; was: string }> = {
    sm: { now: "text-sm font-semibold", was: "text-xs" },
    md: { now: "text-lg font-semibold", was: "text-sm" },
    lg: { now: "text-2xl font-medium tracking-tight", was: "text-base" },
    /** The product page's hero price, in the display face the rest of that column uses. */
    xl: { now: "text-5xl md:text-6xl font-display font-light tracking-tight", was: "text-xl" },
}

interface PriceTagProps {
    /** What the customer pays. Serialised money (ADR 0001) — never a number. */
    price: SerializedMoney
    /** The undiscounted price. Rendered only when it is genuinely higher. */
    basePrice?: SerializedMoney | null
    size?: PriceSize
    className?: string
}

export function PriceTag({ price, basePrice, size = "lg", className }: PriceTagProps) {
    const locale = useLocale()
    const t = useTranslations("product-card")

    // A base price equal to the price is the ordinary case, not a discount of zero.
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

/**
 * The corner badge. Separate from the tag because it belongs to the image, not to the number,
 * and because a listing shows it at the tile's corner while a product page shows it beside the
 * price.
 */
export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
    const locale = useLocale()
    const t = useTranslations("product-card")

    if (percent <= 0) return null

    // Arabic-Indic digits in Arabic, like every other number on the storefront.
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
