"use client"

import { Link } from "@/i18n/navigation"
import { useTranslations } from 'next-intl'
import Image from "@/components/app-image"

import { Reveal } from "@/components/reveal"

/**
 * A category tile.
 *
 * The GSAP block this replaces was visibly broken in the browser, not just theoretically: it set
 * the image and the content to `opacity: 0` on mount and revealed them from a ScrollTrigger with
 * `start: "top 75%"`, `end: "top 35%"` and `scrub: 1` — so a card that was ALREADY past that
 * range when the page loaded never animated, and stayed invisible. On `/category` the first tile
 * rendered as an empty box with a "01" badge in it.
 *
 * Its cleanup was worse than the bug: `ScrollTrigger.getAll().forEach(t => t.kill())` on unmount
 * killed every ScrollTrigger on the page, including ones belonging to other components.
 *
 * `Reveal` does the same fade with the opposite failure mode — visible unless JavaScript is
 * running and motion is welcome.
 */

interface CategoryCardProps {
    title: string
    subtitle: string
    description: string
    imageUrl: string
    href: string
    index: number
}

const CategoryCard = ({ title, subtitle, description, imageUrl, href, index }: CategoryCardProps) => {
    const t = useTranslations("CategoryCard")

    const hasValidImage = imageUrl && imageUrl.trim() !== ""

    return (
        <Reveal index={index} className="group">
            <Link href={href} className="block">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {hasValidImage ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <svg
                                className="w-14 h-14 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={0.8}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                    )}
                    <div className="absolute top-4 ltr:left-4 rtl:right-4 z-10">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-background/80 backdrop-blur-sm text-foreground/70 text-2xs font-medium tracking-label border border-border">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 transition-colors duration-(--duration-slow) ease-out-fast group-hover:bg-foreground/10" />
                </div>
                <div className="space-y-3 pt-5 pb-2">
                    <p className="text-2xs uppercase tracking-label text-muted-foreground font-light">
                        {subtitle}
                    </p>
                    <h3 className="text-lg md:text-xl font-display italic tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors duration-(--duration-base) ease-out-fast">
                        {title}
                    </h3>
                    <div className="flex items-center gap-3 pt-1">
                        <div className="h-px w-14 origin-left scale-x-[0.571] bg-border transition-[scale,background-color] duration-(--duration-slow) ease-out-fast group-hover:scale-x-100 group-hover:bg-primary rtl:origin-right" />
                        <span className="text-2xs uppercase tracking-label text-muted-foreground opacity-0 transition-opacity duration-(--duration-base) ease-out-fast group-hover:opacity-100 whitespace-nowrap">
                            {t("text")}
                        </span>
                    </div>
                </div>
            </Link>
        </Reveal>
    )
}

export default CategoryCard