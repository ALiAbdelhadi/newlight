"use client"

import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { useTranslations } from 'next-intl'
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

    return (
        <div ref={cardRef} className="group cursor-pointer rounded-2xl p-6 transition-all">
            <Link href={href} className="block">
                <div ref={imageRef} className="relative overflow-hidden aspect-square mb-8 bg-muted">
                    <Image
                        src={imageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        width={1000}
                        height={1250}
                    />
                </div>
                <div ref={contentRef} className="space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-light">
                            {subtitle}
                        </p>
                        <h3 className="text-xl md:text-2xl font-light tracking-tight text-foreground mb-3">
                            {title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <span className="text-foreground text-sm font-medium tracking-wider uppercase group-hover:text-muted-foreground transition-colors">
                            {t("text")}
                        </span>
                        <svg
                            className="w-5 h-5 text-foreground group-hover:translate-x-1 transition-transform duration-300 rtl:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                        </svg>
                    </div>
                    <div className="h-px w-12 bg-border group-hover:bg-primary" />
                </div>
            </Link>
        </div>
    )
}

export default CategoryCard