"use client"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

interface ProductCardProps {
    id: string
    image: string
    title: string
    category: string
    price: number
    badge?: string
    onClick?: () => void
}

export function ProductCard({ id, image, title, category, price, badge, onClick }: ProductCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const t = useTranslations("product-card")
    useEffect(() => {
        if (!cardRef.current) return

        gsap.set([imageRef.current, contentRef.current], {
            opacity: 0,
        })

        gsap.set(imageRef.current, {
            filter: "grayscale(60%)",
        })

        const animateOnScroll = () => {
            gsap.to(imageRef.current, {
                filter: "grayscale(0%)",
                opacity: 1,
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: cardRef.current,
                    start: "top 80%",
                    end: "top 60%",
                    scrub: 0.5,
                    once: true,
                },
            })

            gsap.to(contentRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: cardRef.current,
                    start: "top 80%",
                    end: "top 70%",
                    scrub: 0.5,
                    once: true,
                },
            })
        }

        animateOnScroll()

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        }
    }, [])

    const handleMouseEnter = () => {
        if (imageRef.current) {
            gsap.to(imageRef.current, {
                scale: 1.05,
                duration: 0.5,
                ease: "power2.out",
            })
        }
    }

    const handleMouseLeave = () => {
        if (imageRef.current) {
            gsap.to(imageRef.current, {
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
            })
        }
    }

    return (
        <div ref={cardRef} onClick={onClick} className="group cursor-pointer rounded-2xl p-6 hover:shadow-md border border-border/30 transition-all">
            <div
                className="relative overflow-hidden bg-muted mb-6 aspect-square"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Image
                    ref={imageRef}
                    src={image || "/placeholder.svg"}
                    alt={title}
                    width={500}
                    height={500}
                    className="object-cover h-full w-full"
                    priority={false}
                />
                {badge && (
                    <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1">
                        <p className="text-xs font-medium uppercase tracking-wider">{badge}</p>
                    </div>
                )}
            </div>
            <div ref={contentRef} className="space-y-3">
                <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-light mb-1">{category}</p>
                    <h3 className="text-lg md:text-xl font-light tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                        {title}
                    </h3>
                </div>
                <div className="flex items-end justify-between pt-2 border-t border-border">
                    <div className="flex items-baseline gap-1 rtl:flex-row-reverse">
                        <span className="text-2xl font-light text-foreground">{t("currency")}</span>
                        <span className="text-3xl font-light tracking-tight text-foreground">
                            {price !== undefined ? price.toLocaleString() : "0"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-medium uppercase tracking-wider text-foreground">{t("view")}</span>
                        <svg className="w-4 h-4 text-foreground rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}