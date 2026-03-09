"use client"

import CategoryCard from "@/components/category-card"
import { Container } from "@/components/container"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

type Category = {
    key: string
    slug: string
    name: string
    description: string
    imageUrl: string
}

interface CategoriesSectionProps {
    categories: Category[]
}

export default function CategoriesSection({ categories }: CategoriesSectionProps) {
    const t = useTranslations("categories-page")
    const heroRef = useRef(null)
    const heroTitleRef = useRef(null)
    const heroSubtitleRef = useRef(null)
    const categoriesGridRef = useRef(null)
    const categoryRefs = useRef<HTMLDivElement[]>([])

    useEffect(() => {
        if (!heroRef.current || !heroTitleRef.current || !heroSubtitleRef.current) return

        const ctx = gsap.context(() => {
            requestAnimationFrame(() => {
                if (!heroRef.current || !heroTitleRef.current || !heroSubtitleRef.current) return

                gsap.set([heroTitleRef.current, heroSubtitleRef.current], {
                    opacity: 0,
                    y: 30,
                })

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: heroRef.current,
                        start: "top 80%",
                        end: "top 50%",
                        scrub: 0.5,
                        once: true,
                    },
                })

                tl.to(heroTitleRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: "power3.out",
                }).to(
                    heroSubtitleRef.current,
                    {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
                    },
                    "-=0.6",
                )
            })
        })

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        if (categoryRefs.current.length === 0) return

        categoryRefs.current.forEach((el, index) => {
            if (!el) return

            gsap.set(el, {
                opacity: 0,
                y: 40,
            })

            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 1,
                delay: index * 0.15,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    end: "top 60%",
                    scrub: 0.5,
                    once: true,
                },
            })
        })

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        }
    }, [categories])

    return (
        <div className="min-h-screen">
            <section ref={heroRef} className="py-24 lg:py-32 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <Container>
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
                        <div className="max-w-2xl space-y-6 group">
                            <p className="text-xs uppercase tracking-[0.4em] text-primary font-medium">
                                Collections
                            </p>
                            <h1
                                ref={heroTitleRef}
                                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif italic text-foreground tracking-tight leading-[1]"
                            >
                                {t("heroTitle")}
                            </h1>
                            <div className="h-px w-20 bg-primary opacity-50 group-hover:w-40 transition-all duration-300" />
                        </div>
                        <div ref={heroSubtitleRef} className="max-w-sm space-y-6">
                            <p className="text-base md:text-lg font-light text-muted-foreground tracking-wide leading-relaxed">
                                {t("heroSubtitle")}
                            </p>
                            {categories.length > 0 && (
                                <span className="inline-flex items-center gap-2.5 rounded-full border border-border/60 px-5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground font-light">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                                    {categories.length} {categories.length === 1 ? "Category" : "Categories"}
                                </span>
                            )}
                        </div>
                    </div>
                </Container>
            </section>

            <section ref={categoriesGridRef} className="pb-28 lg:pb-36">
                <Container>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 lg:gap-x-8 lg:gap-y-16">
                        {categories.map((category, index) => (
                            <div
                                key={category.key}
                                ref={(el) => {
                                    if (el) categoryRefs.current[index] = el
                                }}
                            >
                                <CategoryCard
                                    title={category.name}
                                    subtitle={t("exploreCollection")}
                                    description={category.description}
                                    imageUrl={category.imageUrl || ""}
                                    href={`/category/${category.slug}`}
                                    index={index}
                                />
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
            <section className="border-t border-border/60">
                <Container className="py-24 lg:py-32">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
                        <div className="max-w-2xl space-y-5">
                            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground font-light">
                                Expert Consultation
                            </p>
                            <h2 className="text-4xl md:text-5xl font-serif italic tracking-tight text-foreground text-balance">
                                {t("ctaTitle")}
                            </h2>
                            <p className="text-base font-light text-muted-foreground tracking-wide leading-relaxed">
                                {t("ctaDescription")}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[200px]">
                            <Link
                                href="/contact"
                                className="group inline-flex items-center justify-center gap-2 px-8 py-4 border border-border hover:border-foreground bg-background hover:bg-muted transition-all duration-300 text-foreground text-sm uppercase tracking-widest font-light"
                            >
                                {t("ctaContact")}
                            </Link>
                            <Link
                                href="/about"
                                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-foreground hover:bg-foreground/90 transition-all duration-300 text-background text-sm uppercase tracking-widest font-light"
                            >
                                {t("ctaLearn")}
                                <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}