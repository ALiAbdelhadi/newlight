"use client"

import { Container } from "@/components/container"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowRight, Award, CircleCheck, Eye, Lamp, Lightbulb, Shield, Target, Truck, Zap } from "lucide-react"
import type React from "react"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import Image from "next/image"

gsap.registerPlugin(ScrollTrigger)

interface FeatureData {
    title: string
    description: string
}

interface Feature extends FeatureData {
    icon: React.ReactNode
}

interface CategoryData {
    title: string
    description: string
    image: string
    slug: string
}

const featureIcons: React.ReactNode[] = [
    <Lightbulb className="w-8 h-8 text-accent group-hover:text-primary" key="lightbulb" />,
    <Award className="w-8 h-8 text-accent group-hover:text-primary" key="award" />,
    <Truck className="w-8 h-8 text-accent group-hover:text-primary" key="truck" />,
    <Shield className="w-8 h-8 text-accent group-hover:text-primary" key="shield" />,
    <CircleCheck className="w-8 h-8 text-accent group-hover:text-primary" key="check" />,
    <Zap className="w-8 h-8 text-accent group-hover:text-primary" key="zap" />,
]

export function AboutUsClient() {
    const t = useTranslations("about-us-page")
    const sectionRef = useRef<HTMLDivElement>(null)
    const featureRefs = useRef<HTMLDivElement[]>([])
    const categoryRefs = useRef<HTMLElement[]>([])
    const visionMissionRef = useRef<HTMLDivElement>(null)

    const translatedFeaturesData = t.raw("features") as FeatureData[]
    const features: Feature[] = translatedFeaturesData.map((data, index) => ({
        ...data,
        icon: featureIcons[index] || <Lightbulb className="w-8 h-8 text-accent group-hover:text-primary" />,
    }))

    const categories = t.raw("categories") as CategoryData[]

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (sectionRef.current) {
                gsap.from(sectionRef.current.querySelector(".hero-title"), {
                    opacity: 0,
                    y: 40,
                    duration: 1,
                    ease: "power3.out",
                })
                gsap.from(sectionRef.current.querySelector(".hero-subtitle"), {
                    opacity: 0,
                    y: 30,
                    duration: 1,
                    delay: 0.2,
                    ease: "power3.out",
                })
            }

            featureRefs.current.forEach((ref, index) => {
                if (ref) {
                    gsap.set(ref, {
                        opacity: 0,
                        y: 60,
                    })

                    gsap.to(ref, {
                        opacity: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ref,
                            start: "top 80%",
                            end: "top 50%",
                            scrub: 1,
                            once: true,
                        },
                        delay: index * 0.1,
                    })
                }
            })

            categoryRefs.current.forEach((ref, index) => {
                if (ref) {
                    gsap.set(ref, {
                        opacity: 0,
                        scale: 0.95,
                    })

                    gsap.to(ref, {
                        opacity: 1,
                        scale: 1,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ref,
                            start: "top 80%",
                            end: "top 50%",
                            scrub: 1,
                            once: true,
                        },
                        delay: index * 0.15,
                    })
                }
            })

            if (visionMissionRef.current) {
                gsap.set(visionMissionRef.current, {
                    opacity: 0,
                    y: 50,
                })

                gsap.to(visionMissionRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: visionMissionRef.current,
                        start: "top 80%",
                        end: "top 50%",
                        scrub: 1,
                        once: true,
                    },
                })
            }
        })

        return () => ctx.revert()
    }, [])

    return (
        <div ref={sectionRef} className="min-h-screen">
            <section className="min-h-[60vh] flex items-center justify-center bg-card text-card-foreground py-24 lg:py-32">
                <Container>
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="hero-title text-6xl md:text-7xl lg:text-8xl font-serif font-light tracking-tighter mb-6 text-balance">
                            {t("heroTitle")}
                        </h1>
                        <p className="hero-subtitle text-lg md:text-xl font-light text-muted-foreground leading-relaxed max-w-2xl mx-auto text-balance">
                            {t("heroSubtitle")}
                        </p>
                        <div className="mt-8 h-px w-16 bg-accent group-hover:text-primary mx-auto" />
                    </div>
                </Container>
            </section>
            <section className="py-16 lg:py-24 bg-background">
                <Container>
                    <div className="mb-16">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-tighter mb-4 text-balance">
                            {t("featuresTitle")}
                        </h2>
                        <p className="text-lg text-muted-foreground font-light max-w-2xl">{t("featuresSubtitle")}</p>
                        <div className="h-px w-12 bg-border mt-6" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                ref={(el) => {
                                    if (el) featureRefs.current[index] = el
                                }}
                                className="flex flex-col group"
                            >
                                <div className="mb-6 transition-transform duration-300 group-hover:scale-110 ">{feature.icon}</div>
                                <h3 className="text-2xl md:text-3xl font-serif font-light tracking-tight mb-4">{feature.title}</h3>
                                <p className="text-base font-light text-muted-foreground tracking-wide leading-relaxed">
                                    {feature.description}
                                </p>
                                <div className="mt-6 h-px w-12 bg-border transition-all duration-300 group-hover:w-24 group-hover:bg-primary" />
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
            <section className="py-16 lg:py-24 bg-card">
                <Container>
                    <div className="mb-16">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light tracking-tighter mb-4 text-balance">
                            {t("categoriesTitle")}
                        </h2>
                        <p className="text-lg text-muted-foreground font-light max-w-2xl">{t("categoriesSubtitle")}</p>
                        <div className="h-px w-12 bg-border mt-6" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                        {categories.map((category, index) => (
                            <div
                                key={index}
                                ref={(el) => {
                                    if (el) categoryRefs.current[index] = el
                                }}
                                className="group"
                            >
                                <Link href={`/category/${category.slug}`}>
                                    <div className="relative overflow-hidden rounded-sm aspect-4/5 bg-muted mb-6">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                                            style={{
                                                backgroundImage: `url('${category.image || "/placeholder.svg"}')`,
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-linear-to-t from-foreground/70 via-foreground/20 to-transparent" />
                                        <div className="relative z-10 h-full flex flex-col justify-end p-6">
                                            <div className="space-y-2">
                                                <h3 className="text-3xl md:text-4xl font-serif font-light tracking-wide text-accent">
                                                    {category.title}
                                                </h3>
                                                <div className="h-px w-12 bg-primary-foreground/60 transition-all duration-500 group-hover:w-20 group-hover:bg-primary" />
                                                <p className="text-accent/70 font-light text-base tracking-wide leading-relaxed max-w-xl">
                                                    {category.description}
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-2 text-white/70 dark:text-black opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                                <div className="flex items-center gap-2 text-sm text-background font-light">
                                                    <span>{t("exploreCategory")}</span>
                                                    <ArrowRight className="w-4 h-4 text-background/80 rtl:rotate-180" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>
            <section ref={visionMissionRef} className="py-16 lg:py-24 bg-background">
                <Container>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                        <div className="flex flex-col">
                            <div className="mb-8 text-accent group-hover:text-primary ">
                                <Eye className="w-12 h-12 group-hover:text-primary" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tighter mb-6">{t("visionTitle")}</h2>
                            <p className="text-lg font-light text-muted-foreground leading-relaxed">{t("visionDescription")}</p>
                            <div className="mt-8 h-px w-16 bg-accent group-hover:text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <div className="mb-8 text-accent group-hover:text-primary">
                                <Target className="w-12 h-12 group-hover:text-primary" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tighter mb-6">{t("missionTitle")}</h2>
                            <p className="text-lg font-light text-muted-foreground leading-relaxed">{t("missionDescription")}</p>
                            <div className="mt-8 h-px w-16 bg-accent group-hover:text-primary" />
                        </div>
                    </div>
                </Container>
            </section>
            <section className="py-16 lg:py-24 bg-card">
                <Container>
                    <div className="max-w-3xl mx-auto text-center">
                        <Lamp className="w-16 h-16 text-primary mx-auto mb-8" />
                        <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tighter mb-6 text-balance">
                            {t("ctaTitle")}
                        </h2>
                        <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">{t("ctaDescription")}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/category"
                                className="px-8 py-4 bg-primary text-primary-foreground font-light tracking-wide transition-all duration-300 hover:bg-primary/90 hover:scale-105"
                            >
                                {t("ctaExplore")}
                            </Link>
                            <Link
                                href="/contact"
                                className="px-8 py-4 border border-border text-foreground font-light tracking-wide transition-all duration-300 hover:bg-secondary hover:border-accent group-hover:text-primary"
                            >
                                {t("ctaContact")}
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>
        </div>
    )
}
