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
        <div 
            ref={cardRef} 
            onClick={onClick} 
            className="group relative cursor-pointer rounded-xl bg-card border border-border/50 transition-all duration-500 hover:shadow-premium hover:-translate-y-1 overflow-hidden"
        >
            <div
                className="relative overflow-hidden aspect-square"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Image
                    ref={imageRef}
                    src={image || "/placeholder.svg"}
                    alt={title}
                    width={500}
                    height={500}
                    className="object-cover h-full w-full transition-transform duration-700 ease-out"
                    priority={false}
                />
                
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <span className="px-6 py-2.5 bg-background/90 backdrop-blur-md text-foreground text-xs font-medium uppercase tracking-widest rounded-full shadow-lg">
                            {t("view")}
                        </span>
                    </div>
                </div>

                {badge && (
                    <div className="absolute top-4 left-4 z-10 bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-1 rounded-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest">{badge}</p>
                    </div>
                )}
            </div>
            
            <div ref={contentRef} className="p-6 space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{category}</p>
                    <h3 className="lg:text-2xl text-lg font-serif italic tracking-tight text-foreground transition-colors duration-300">
                        {title}
                    </h3>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-baseline gap-1.5 rtl:flex-row-reverse">
                        <span className="text-xl font-light text-foreground">{t("currency")}</span>
                        <span className="text-2xl font-medium tracking-tight text-foreground">
                            {price !== undefined ? price.toLocaleString() : "0"}
                        </span>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                        <svg className="w-4 h-4 text-foreground group-hover:text-primary-foreground rtl:rotate-180 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}