"use client"

import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslations } from 'next-intl'
import Image from "next/image"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

interface CategoryCardProps {
    title: string
    subtitle: string
    description: string
    imageUrl: string
    href: string
    index: number
}

const CategoryCard = ({ title, subtitle, description, imageUrl, href, index }: CategoryCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const t = useTranslations("CategoryCard")

    useEffect(() => {
        if (!cardRef.current || !imageRef.current || !contentRef.current) return

        gsap.set(imageRef.current, {
            opacity: 0,
            scale: 1.1,
            filter: "grayscale(70%)",
        })

        gsap.set(contentRef.current, {
            opacity: 0,
            y: 40,
        })

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: cardRef.current,
                start: "top 75%",
                end: "top 35%",
                scrub: 1,
                once: true,
            },
        })

        tl.to(imageRef.current, {
            opacity: 1,
            scale: 1,
            filter: "grayscale(0%)",
            duration: 1.2,
            ease: "power3.out",
        })

        tl.to(contentRef.current, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
        }, "-=0.8")

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        }
    }, [])

    const hasValidImage = imageUrl && imageUrl.trim() !== ""

    return (
        <div ref={cardRef} className="group cursor-pointer">
            <Link href={href} className="block">
                <div ref={imageRef} className="relative overflow-hidden aspect-square bg-muted">
                    {hasValidImage ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <svg
                                className="w-14 h-14 text-muted-foreground/25"
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
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-background/80 backdrop-blur-sm text-foreground/70 text-[10px] font-medium tracking-wider border border-border/50">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-500" />
                </div>
                <div ref={contentRef} className="pt-5 pb-2 space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-light">
                        {subtitle}
                    </p>
                    <h3 className="text-lg md:text-xl font-serif italic tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors duration-300">
                        {title}
                    </h3>
                    <div className="flex items-center gap-3 pt-1">
                        <div className="h-px w-8 bg-border group-hover:w-14 group-hover:bg-primary transition-all duration-500 ease-out" />
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-300 whitespace-nowrap">
                            {t("text")}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default CategoryCard