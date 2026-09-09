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
    specs?: Array<{ label: string; value: string }>
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
                "transition-[box-shadow,translate,scale] duration-(--duration-base) ease-out-fast",
                "hover:-translate-y-0.5 hover:shadow-overlay",
                "active:scale-[0.99] active:duration-(--duration-fast)"
            )}
        >
            <div className="relative aspect-square overflow-hidden">
                <Image
                    src={image || "/placeholder.svg"}
                    alt=""
                    width={500}
                    height={500}
                    data-reveal-media
                    className={cn(
                        "size-full object-cover",
                        "transition-[scale,filter] duration-(--duration-slow) ease-out-fast",
                        "group-hover:scale-105",
                        "group-active:scale-[1.02] group-active:duration-(--duration-fast)"
                    )}
                    priority={false}
                />
                <div
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
                    <p className="truncate text-xs text-muted-foreground">
                        {specs.map((spec, index) => (
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