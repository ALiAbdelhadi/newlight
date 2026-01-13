"use client"

import { Container } from "@/components/container"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowRight,
  Award,
  CheckCircle,
  Download,
  FileText,
  Lightbulb,
  TrendingUp,
  Zap
} from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useRef } from "react"

gsap.registerPlugin(ScrollTrigger)

export default function TechnicalResources() {
  const t = useTranslations("technical-resources")

  const heroRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubtitleRef = useRef<HTMLParagraphElement>(null)
  const heroImageRef = useRef<HTMLDivElement>(null)

  const introRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const benefitCardsRef = useRef<(HTMLDivElement | null)[]>([])

  const comparisonRef = useRef<HTMLDivElement>(null)
  const beforeImageRef = useRef<HTMLDivElement>(null)
  const afterImageRef = useRef<HTMLDivElement>(null)

  const processRef = useRef<HTMLDivElement>(null)
  const processStepsRef = useRef<(HTMLDivElement | null)[]>([])

  const ctaRef = useRef<HTMLDivElement>(null)

  // Hero Animation
  useEffect(() => {
    if (!heroRef.current || !heroTitleRef.current || !heroSubtitleRef.current || !heroImageRef.current) return

    const ctx = gsap.context(() => {
      gsap.set([heroTitleRef.current, heroSubtitleRef.current], {
        opacity: 0,
        y: 40,
      })

      gsap.set(heroImageRef.current, {
        opacity: 0,
        scale: 1.1,
        filter: "grayscale(80%)",
      })

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.to(heroTitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
      })
        .to(
          heroSubtitleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 1,
          },
          "-=0.7"
        )
        .to(
          heroImageRef.current,
          {
            opacity: 1,
            scale: 1,
            filter: "grayscale(0%)",
            duration: 1.4,
          },
          "-=0.8"
        )
    })

    return () => ctx.revert()
  }, [])

  // Intro Section Animation
  useEffect(() => {
    if (!introRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(introRef.current?.children || [], {
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: introRef.current,
          start: "top 75%",
          once: true,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  // Benefits Animation
  useEffect(() => {
    benefitCardsRef.current.forEach((card, index) => {
      if (!card) return

      gsap.set(card, {
        opacity: 0,
        y: 60,
      })

      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 80%",
          once: true,
        },
        delay: index * 0.1,
      })
    })
  }, [])

  // Comparison Animation
  useEffect(() => {
    if (!beforeImageRef.current || !afterImageRef.current) return

    gsap.set([beforeImageRef.current, afterImageRef.current], {
      opacity: 0,
      filter: "grayscale(60%)",
    })

    gsap.to(beforeImageRef.current, {
      opacity: 1,
      filter: "grayscale(0%)",
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: beforeImageRef.current,
        start: "top 75%",
        once: true,
      },
    })

    gsap.to(afterImageRef.current, {
      opacity: 1,
      filter: "grayscale(0%)",
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: afterImageRef.current,
        start: "top 75%",
        once: true,
      },
      delay: 0.3,
    })
  }, [])

  // Process Steps Animation
  useEffect(() => {
    processStepsRef.current.forEach((step, index) => {
      if (!step) return

      gsap.from(step, {
        opacity: 0,
        x: index % 2 === 0 ? -40 : 40,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: step,
          start: "top 80%",
          once: true,
        },
        delay: index * 0.1,
      })
    })
  }, [])

  // CTA Animation
  useEffect(() => {
    if (!ctaRef.current) return

    gsap.from(ctaRef.current.children, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ctaRef.current,
        start: "top 80%",
        once: true,
      },
    })
  }, [])

  const benefits = [
    {
      icon: <Lightbulb className="w-8 h-8" />,
      titleKey: "benefits.optimized.title",
      descKey: "benefits.optimized.description",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      titleKey: "benefits.energy.title",
      descKey: "benefits.energy.description",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      titleKey: "benefits.mood.title",
      descKey: "benefits.mood.description",
    },
    {
      icon: <Award className="w-8 h-8" />,
      titleKey: "benefits.professional.title",
      descKey: "benefits.professional.description",
    },
  ]

  const processSteps = [
    {
      number: "01",
      titleKey: "process.analysis.title",
      descKey: "process.analysis.description",
    },
    {
      number: "02",
      titleKey: "process.design.title",
      descKey: "process.design.description",
    },
    {
      number: "03",
      titleKey: "process.simulation.title",
      descKey: "process.simulation.description",
    },
    {
      number: "04",
      titleKey: "process.implementation.title",
      descKey: "process.implementation.description",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <section ref={heroRef} className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <div className="h-px w-12 bg-accent" />
                <span className="uppercase tracking-wider">{t("hero.label")}</span>
              </div>

              <h1 ref={heroTitleRef} className="text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {t("hero.title")}
              </h1>

              <p ref={heroSubtitleRef} className="text-xl text-muted-foreground leading-relaxed">
                {t("hero.subtitle")}
              </p>
            </div>
            <div ref={heroImageRef} className="relative aspect-4/3 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80"
                alt="Lighting Design Studio"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </Container>
      </section>
      <section ref={introRef} className="py-16 lg:py-24">
        <Container>
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t("intro.title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("intro.description")}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("intro.impact")}
            </p>
          </div>
        </Container>
      </section>
      <section ref={benefitsRef} className="py-16 lg:py-24 bg-muted/30">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <div className="h-px w-12 bg-accent" />
              <span className="uppercase tracking-wider">{t("benefits.label")}</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t("benefits.title")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                ref={(el) => {
                  benefitCardsRef.current[index] = el
                }}
                className="bg-background rounded-lg p-8 border border-border hover:border-accent transition-all duration-300 group"
              >
                <div className="mb-4 text-accent group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{t(benefit.titleKey)}</h3>
                <p className="text-muted-foreground leading-relaxed">{t(benefit.descKey)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section ref={comparisonRef} className="py-16 lg:py-24">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              {t("comparison.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("comparison.subtitle")}
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div
                ref={beforeImageRef}
                className="relative aspect-4/3 rounded-lg overflow-hidden group"
              >
                <Image
                  src="/technical/technical-resources-1.png"
                  alt="Before Lighting Study"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-block bg-destructive/90 text-white px-4 py-2 rounded-sm text-sm font-semibold mb-2">
                    {t("comparison.before")}
                  </div>
                  <h3 className="text-white text-xl font-bold">
                    {t("comparison.beforeTitle")}
                  </h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full border-2 border-destructive shrink-0 mt-0.5" />
                    <span>{t(`comparison.beforePoints.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div
                ref={afterImageRef}
                className="relative aspect-4/3 rounded-lg overflow-hidden group"
              >
                <Image
                  src="/technical/technical-resources-2.png"
                  alt="After Lighting Study"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-block bg-accent/90 text-accent-foreground px-4 py-2 rounded-sm text-sm font-semibold mb-2">
                    {t("comparison.after")}
                  </div>
                  <h3 className="text-white text-xl font-bold">
                    {t("comparison.afterTitle")}
                  </h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{t(`comparison.afterPoints.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>
      <section ref={processRef} className="py-16 lg:py-24 bg-muted/30">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <div className="h-px w-12 bg-accent" />
              <span className="uppercase tracking-wider">{t("process.label")}</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t("process.title")}
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-8">
            {processSteps.map((step, index) => (
              <div
                key={index}
                ref={(el) => {
                  processStepsRef.current[index] = el
                }}
                className="bg-background rounded-lg p-8 border border-border hover:border-accent transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="text-6xl font-bold text-accent/20 leading-none">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3">{t(step.titleKey)}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section ref={ctaRef} className="py-16 lg:py-24">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-primary">
              {t("cta.title")}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-14 px-8 text-base"
              >
                <Link href="/contact">
                  {t("cta.contact")}
                  <ArrowRight className="w-5 h-5 ml-2 rtl:-rotate-180" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="default"
                className="h-14 px-8 text-base"
              >
                <Link href="/category">
                  {t("cta.explore")}
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}