"use client"

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
            <section ref={heroRef} className="py-24">
                <Container>
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <div className="space-y-6">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">
                                Collections
                            </p>
                            <h1
                                ref={heroTitleRef}
                                className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-light tracking-tight text-foreground text-balance leading-[1.1]"
                            >
                                {t("heroTitle")}
                            </h1>
                            <div className="flex justify-center">
                                <div className="h-px w-24 bg-primary" />
                            </div>
                        </div>
                        <p
                            ref={heroSubtitleRef}
                            className="text-lg md:text-xl font-light text-muted-foreground tracking-wide max-w-2xl mx-auto leading-relaxed"
                        >
                            {t("heroSubtitle")}
                        </p>
                    </div>
                </Container>
            </section>
            <section ref={categoriesGridRef} className="pb-28 lg:pb-36">
                <Container>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                        {categories.map((category, index) => (
                            <div
                                key={category.key}
                                ref={(el) => {
                                    if (el) categoryRefs.current[index] = el
                                }}
                                className="group"
                            >
                                <Link href={`/category/${category.slug}`} className="block">
                                    <div className="relative overflow-hidden rounded-sm aspect-4/5 bg-muted mb-6">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                                            style={{
                                                backgroundImage: `url('${category.imageUrl}')`,
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-foreground/70 via-foreground/20 to-transparent" />
                                        <div className="relative z-10 h-full flex flex-col justify-end p-6">
                                            <div className="space-y-3">
                                                <h3 className="text-3xl md:text-4xl font-serif font-light text-primary-foreground tracking-wide">
                                                    {category.name}
                                                </h3>
                                                <div className="h-px w-12 bg-primary-foreground/60 group-hover:bg-primary transition-all duration-500 group-hover:w-20" />
                                            </div>
                                            <div className="mt-6 flex items-center gap-2 text-primary-foreground/80 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                                <span className="text-sm uppercase tracking-widest font-light">
                                                    {t("exploreCollection")}
                                                </span>
                                                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground font-light text-sm tracking-wide leading-relaxed">
                                        {category.description}
                                    </p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
            <section className="border-t border-border bg-secondary/30">
                <Container className="py-24 lg:py-32">
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <div className="space-y-4">
                            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-light">
                                Expert Consultation
                            </p>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-tight text-foreground text-balance">
                                {t("ctaTitle")}
                            </h2>
                            <div className="flex justify-center pt-2">
                                <div className="h-px w-16 bg-accent" />
                            </div>
                        </div>
                        <p className="text-base md:text-lg font-light text-muted-foreground tracking-wide max-w-xl mx-auto leading-relaxed">
                            {t("ctaDescription")}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                            <Link
                                href="/contact"
                                className="group inline-flex items-center justify-center gap-2 rounded-sm px-8 py-4 border border-border bg-background hover:bg-muted transition-all duration-300 text-foreground"
                            >
                                <span className="font-light tracking-wide text-sm uppercase">
                                    {t("ctaContact")}
                                </span>
                            </Link>
                            <Link
                                href="/about"
                                className="group inline-flex items-center justify-center gap-2 rounded-sm px-8 py-4 bg-primary hover:bg-primary/90 transition-all duration-300 text-primary-foreground"
                            >
                                <span className="font-light tracking-wide text-sm uppercase">
                                    {t("ctaLearn")}
                                </span>
                                <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}