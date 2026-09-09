"use client"

import { Container } from "@/components/layout/section"
import { Link } from "@/i18n/navigation"
import { Award, Lightbulb, TrendingUp, Zap } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "@/components/app-image"
import type React from "react"
import { DirectionalArrow } from "@/components/directional-arrow"
import { RevealScope } from "@/components/reveal-scope"

const benefits: { icon: React.ReactNode; titleKey: string; descKey: string }[] = [
  {
    icon: <Lightbulb className="w-8 h-8" strokeWidth={1.25} />,
    titleKey: "benefits.optimized.title",
    descKey: "benefits.optimized.description",
  },
  {
    icon: <Zap className="w-8 h-8" strokeWidth={1.25} />,
    titleKey: "benefits.energy.title",
    descKey: "benefits.energy.description",
  },
  {
    icon: <TrendingUp className="w-8 h-8" strokeWidth={1.25} />,
    titleKey: "benefits.mood.title",
    descKey: "benefits.mood.description",
  },
  {
    icon: <Award className="w-8 h-8" strokeWidth={1.25} />,
    titleKey: "benefits.professional.title",
    descKey: "benefits.professional.description",
  },
]

const processSteps: { number: string; titleKey: string; descKey: string }[] = [
  { number: "01", titleKey: "process.analysis.title", descKey: "process.analysis.description" },
  { number: "02", titleKey: "process.design.title", descKey: "process.design.description" },
  { number: "03", titleKey: "process.simulation.title", descKey: "process.simulation.description" },
  { number: "04", titleKey: "process.implementation.title", descKey: "process.implementation.description" },
]

export default function TechnicalResources() {
  const t = useTranslations("technical-resources")
  return (
    <RevealScope>
      <section className="bg-card text-card-foreground pt-24 pb-16 lg:pt-32 lg:pb-24">
        <Container>
          <div className="max-w-4xl">
            <div data-hero-reveal className="flex items-center gap-4 mb-8">
              <div className="h-px w-12 bg-primary" />
              <span className="text-xs font-light uppercase tracking-label text-muted-foreground">
                {t("hero.label")}
              </span>
            </div>

            <h1
              data-hero-reveal
              className="font-display text-5xl md:text-6xl lg:text-7xl font-light tracking-tighter text-balance mb-8"
            >
              {t("hero.title")}
            </h1>

            <p
              data-hero-reveal
              className="text-lg md:text-xl font-light text-muted-foreground leading-relaxed max-w-2xl text-balance"
            >
              {t("hero.subtitle")}
            </p>
          </div>
        </Container>

        <div data-hero-reveal className="mt-16 lg:mt-24">
          <Container>
            <div className="relative aspect-16/9 lg:aspect-21/9 overflow-hidden rounded-sm bg-muted">
              <Image
                src="/technical/technical-resources-2.png"
                alt={t("hero.title")}
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
                priority
              />
            </div>
          </Container>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div data-reveal className="lg:col-span-5">
              <h2 className="font-display text-4xl md:text-5xl font-light tracking-tighter text-balance">
                {t("intro.title")}
              </h2>
              <div className="h-px w-12 bg-border mt-8" />
            </div>
            <div data-reveal-group className="lg:col-span-7 space-y-6">
              <p className="text-lg font-light text-muted-foreground leading-relaxed tracking-wide">
                {t("intro.description")}
              </p>
              <p className="text-lg font-light text-muted-foreground leading-relaxed tracking-wide">
                {t("intro.impact")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-32 bg-card border-y border-border">
        <Container>
          <div data-reveal className="mb-16 lg:mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-12 bg-primary" />
              <span className="text-xs font-light uppercase tracking-label text-muted-foreground">
                {t("benefits.label")}
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-balance max-w-3xl">
              {t("benefits.title")}
            </h2>
          </div>

          <div
            data-reveal-group
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12"
          >
            {benefits.map((benefit) => (
              <div key={benefit.titleKey} className="group flex flex-col">
                <div className="mb-6 text-muted-foreground transition-colors duration-(--duration-base) ease-out-fast group-hover:text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-display text-2xl font-light tracking-tight mb-4">
                  {t(benefit.titleKey)}
                </h3>
                <p className="text-base font-light text-muted-foreground leading-relaxed tracking-wide">
                  {t(benefit.descKey)}
                </p>
                <div className="mt-6 h-px w-24 origin-left scale-x-50 bg-border transition-[scale,background-color] duration-(--duration-base) ease-out-fast group-hover:scale-x-100 group-hover:bg-primary rtl:origin-right" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-32">
        <Container>
          <div data-reveal className="mb-16 lg:mb-20 max-w-3xl">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-balance mb-6">
              {t("comparison.title")}
            </h2>
            <p className="text-lg font-light text-muted-foreground leading-relaxed tracking-wide">
              {t("comparison.subtitle")}
            </p>
            <div className="h-px w-12 bg-border mt-8" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {(
              [
                {
                  image: "/technical/technical-resources-1.png",
                  labelKey: "comparison.before",
                  titleKey: "comparison.beforeTitle",
                  pointsKey: "comparison.beforePoints",
                  rule: "bg-destructive",
                },
                {
                  image: "/technical/technical-resources-2.png",
                  labelKey: "comparison.after",
                  titleKey: "comparison.afterTitle",
                  pointsKey: "comparison.afterPoints",
                  rule: "bg-primary",
                },
              ] as const
            ).map((side) => (
              <div key={side.labelKey} className="group flex flex-col">
                <div
                  data-reveal-media
                  className="relative aspect-4/3 overflow-hidden rounded-sm bg-muted"
                >
                  <Image
                    src={side.image}
                    alt={t(side.titleKey)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 640px"
                    className="object-cover transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-px w-8 ${side.rule}`} />
                      <span className="text-xs font-light uppercase tracking-label text-on-media-muted">
                        {t(side.labelKey)}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl font-light tracking-tight text-on-media text-balance">
                      {t(side.titleKey)}
                    </h3>
                  </div>
                </div>

                <ul className="mt-8 border-t border-border">
                  {[1, 2, 3].map((i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-4 py-4 border-b border-border"
                    >
                      <span className="font-display text-sm font-light text-muted-foreground tabular-nums">
                        {String(i).padStart(2, "0")}
                      </span>
                      <span className="text-base font-light text-muted-foreground leading-relaxed tracking-wide">
                        {t(`${side.pointsKey}.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-32 bg-card border-y border-border">
        <Container>
          <div data-reveal className="mb-16 lg:mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-12 bg-primary" />
              <span className="text-xs font-light uppercase tracking-label text-muted-foreground">
                {t("process.label")}
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-balance max-w-3xl">
              {t("process.title")}
            </h2>
          </div>

          <ol data-reveal-group className="max-w-4xl border-t border-border">
            {processSteps.map((step) => (
              <li key={step.number} className="group border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10 py-10 lg:py-12">
                  <div className="md:col-span-2">
                    <span className="font-display text-4xl md:text-5xl font-light tracking-tighter text-muted-foreground transition-colors duration-(--duration-base) ease-out-fast group-hover:text-primary tabular-nums">
                      {step.number}
                    </span>
                  </div>
                  <div className="md:col-span-10">
                    <h3 className="font-display text-2xl md:text-3xl font-light tracking-tight mb-4">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-base font-light text-muted-foreground leading-relaxed tracking-wide max-w-2xl">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-20 lg:py-32">
        <Container>
          <div data-reveal-group className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-balance mb-6">
              {t("cta.title")}
            </h2>
            <p className="text-lg font-light text-muted-foreground leading-relaxed tracking-wide mb-10">
              {t("cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-light tracking-wide rounded-sm transition-colors duration-(--duration-base) ease-out-fast hover:bg-primary/90"
              >
                {t("cta.contact")}
                <DirectionalArrow />
              </Link>
              <Link
                href="/category"
                className="inline-flex items-center justify-center px-8 py-4 border border-border text-foreground font-light tracking-wide rounded-sm transition-colors duration-(--duration-base) ease-out-fast hover:bg-secondary hover:border-primary"
              >
                {t("cta.explore")}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </RevealScope>
  )
}
