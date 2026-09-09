"use client"

import Image from "@/components/app-image"
import { DirectionalArrow } from "@/components/directional-arrow"
import { DiscountBadge, PriceTag } from "@/components/price-tag"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"
import { type SerializedMoney } from "@repo/database"
import { useTranslations } from "next-intl"
import { Fragment } from "react"

interface ProductCardProps {
    image: string
    title: string
    category: string
    price: SerializedMoney
    basePrice?: SerializedMoney
    discountPercent?: number
    badge?: string
    /**
     * Two or three specs, already collapsed by `quickSpecs`. A lighting tile that shows a photo,
     * a name and a price makes a customer open it to learn its wattage. The card prints the
     * values only, as one line of description — the labels stay on the product page.
     */
    specs?: Array<{ label: string; value: string }>
    /** A compare checkbox, rendered over the image. Listings pass one; strips do not. */
    action?: React.ReactNode
}

export function ProductCard({
    image,
    title,
    category,
    price,
    basePrice,
    discountPercent = 0,
    badge,
    specs,
    action,
}: ProductCardProps) {
    const t = useTranslations("product-card")

    return (
        <Reveal
            className={cn(
                "group relative overflow-hidden rounded-lg border bg-card",
                // Tailwind v4 compiles `-translate-y-*` to the `translate` property and `scale-*` to
                // `scale` — neither is folded into `transform` any more, so a list naming
                // `transform` transitioned nothing this card changes and the hover jumped.
                "transition-[box-shadow,translate,scale] duration-(--duration-base) ease-out-fast",
                "hover:-translate-y-0.5 hover:shadow-overlay",
                // A press, not a lift: on touch the finger is already on the card, and lifting
                // it away from the point of contact reads as the tap having missed.
                "active:scale-[0.99] active:duration-(--duration-fast)"
            )}
        >
            <div className="relative aspect-square overflow-hidden">
                <Image
                    src={image || "/placeholder.svg"}
                    /* Empty, deliberately: the `h3` below prints this product's name inside the
                       same link, and a screen reader should not read it twice per tile. */
                    alt=""
                    width={500}
                    height={500}
                    data-reveal-media
                    className={cn(
                        "size-full object-cover",
                        // `scale` carries the zoom, `filter` the grayscale entrance.
                        "transition-[scale,filter] duration-(--duration-slow) ease-out-fast",
                        "group-hover:scale-105",
                        "group-active:scale-[1.02] group-active:duration-(--duration-fast)"
                    )}
                    priority={false}
                />
                {/* One gesture, one duration. `backdrop-blur` is gone from the pill: a backdrop
                    filter re-blurs its whole backdrop every frame, and this one did it while
                    the image behind it was scaling. */}
                <div
                    /* Decorative. The word is a hover affordance for a pointer, and the tile is
                       already a link — without this the accessible name of every product link
                       began "View" before it reached the product. */
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-foreground/5 opacity-0 transition-opacity duration-(--duration-slow) ease-out-fast group-hover:opacity-100"
                >
                    <div className="translate-y-4 transition-[translate] duration-(--duration-slow) ease-out-fast group-hover:translate-y-0">
                        <span className="rounded-full bg-background/95 px-6 py-2.5 text-xs font-medium uppercase tracking-label text-foreground shadow-overlay">
                            {t("view")}
                        </span>
                    </div>
                </div>
                {badge && (
                    <div className="absolute top-4 inset-s-4 z-10 rounded-sm bg-primary px-3 py-1 text-primary-foreground">
                        <p className="text-2xs font-bold uppercase tracking-label">{badge}</p>
                    </div>
                )}
                {discountPercent > 0 && (
                    <DiscountBadge percent={discountPercent} className="absolute top-4 inset-e-4 z-10" />
                )}
                {action && (
                    <div className={cn("absolute inset-e-4 z-20", discountPercent > 0 ? "top-16" : "top-4")}>{action}</div>
                )}
            </div>
            <div className="space-y-2 p-4">
                <div className="space-y-1">
                    <p className="text-2xs font-medium tracking-label text-muted-foreground uppercase">
                        {category}
                    </p>
                    <h3 className="font-display text-lg italic tracking-tight text-foreground lg:text-2xl">
                        {title}
                    </h3>
                </div>
                {specs && specs.length > 0 && (
                    /* One quiet line, not a spec sheet. The labelled pairs read as a table wedged
                       under the title, and their bold values competed with it for the eye; the
                       units already say which spec each value is ("6-30 W", "AC 220V"), so the
                       labels were paying for themselves in weight and earning nothing. One line,
                       one weight, clipped rather than wrapped, so every tile stays the same height. */
                    <p className="truncate text-xs text-muted-foreground">
                        {specs.map((spec, index) => (
                            /* Each value is its own bidi isolate. Joined as one plain string, an
                               Arabic tile tore "١٥ W" in half — the digits are Arabic numbers and
                               the unit is Latin, so the RTL paragraph reordered them around the
                               separators and printed "W · Bridge lux ١٥ · تيار متردد". A `bdi`
                               resolves each value on its own, so the units stay on their numbers
                               and the specs stay in order, right to left. */
                            <Fragment key={spec.label}>
                                {index > 0 && " · "}
                                <bdi>{spec.value}</bdi>
                            </Fragment>
                        ))}
                    </p>
                )}
                <div className="flex flex-row items-center justify-between gap-3 border-t pt-4">
                    <PriceTag price={price} basePrice={basePrice} size="md" />
                    <DirectionalArrow variant="circled" />
                </div>
            </div>
        </Reveal>
    )
}