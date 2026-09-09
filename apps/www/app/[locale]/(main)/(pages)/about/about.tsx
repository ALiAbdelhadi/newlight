import { useTranslations } from "next-intl"
import Image from "@/components/app-image"
import type { LucideIcon } from "lucide-react"
import { Award, CircleCheck, Eye, Lightbulb, Shield, Target, Truck, Zap } from "lucide-react"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, PageHeader, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

interface FeatureData {
    title: string
    description: string
}

interface CategoryData {
    title: string
    description: string
    image: string
    slug: string
}

const FEATURE_ICONS: LucideIcon[] = [Lightbulb, Award, Truck, Shield, CircleCheck, Zap]

/**
 * About.
 *
 * This page had a type scale of its own: the display face in `font-light` at 72px for the
 * title, 60px for every section heading and 36px for each feature's `h3` — four sizes, none of
 * them used by any other page, all of them larger than the homepage's. Its bands alternated
 * `bg-card` with the page ground, which on the light theme is the same colour, so the rhythm
 * it was going for did not render.
 *
 * It is a content page, so it leads with `PageHeader` like the others; its sections are
 * `Section`/`SectionHeader`; its feature grid is the homepage's feature grid; and its closing
 * band is the same sunk display-face CTA the homepage and the catalogue end on.
 */
export function AboutUsClient() {
    const t = useTranslations("about-us-page")

    const features = t.raw("features") as FeatureData[]
    const categories = t.raw("categories") as CategoryData[]

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("heroTitle")} description={t("heroSubtitle")} />

            <Section aria-label={t("featuresTitle")}>
                <Container>
                    <SectionHeader title={t("featuresTitle")} description={t("featuresSubtitle")} />
                    <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
                        {features.map((feature, index) => {
                            const Icon = FEATURE_ICONS[index] ?? Lightbulb
                            return (
                                <Reveal as="li" key={feature.title} index={index}>
                                    <Icon aria-hidden className="size-6 text-primary" />
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
                                    <p className="mt-2 text-pretty text-muted-foreground">{feature.description}</p>
                                </Reveal>
                            )
                        })}
                    </ul>
                </Container>
            </Section>

            <Section tone="sunk" aria-label={t("categoriesTitle")}>
                <Container>
                    <SectionHeader title={t("categoriesTitle")} description={t("categoriesSubtitle")} />
                    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                        {categories.map((category, index) => (
                            <Reveal as="li" key={category.slug} index={index}>
                                <Link
                                    href={`/category/${category.slug}`}
                                    className="group relative block aspect-[4/5] overflow-hidden rounded-lg border bg-card"
                                >
                                    <Image
                                        src={category.image || "/placeholder.svg"}
                                        alt=""
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        className="object-cover transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-[1.03]"
                                    />
                                    {/* The scrim and caption sit over a photograph, so they stay
                                        light-on-dark in both themes rather than following the theme. */}
                                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
                                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-background">
                                        <span className="min-w-0">
                                            <span className="block font-display text-2xl italic">{category.title}</span>
                                            <span className="mt-1 line-clamp-2 block text-sm opacity-80">{category.description}</span>
                                        </span>
                                        <DirectionalArrow variant="circled" className="border-background/40 text-background" />
                                    </span>
                                </Link>
                            </Reveal>
                        ))}
                    </ul>
                </Container>
            </Section>

            <Section aria-label={t("visionTitle")}>
                <Container>
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
                        <Reveal>
                            <Eye aria-hidden className="size-6 text-primary" />
                            <h2 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">{t("visionTitle")}</h2>
                            <p className="mt-3 text-lg text-pretty text-muted-foreground">{t("visionDescription")}</p>
                        </Reveal>
                        <Reveal index={1}>
                            <Target aria-hidden className="size-6 text-primary" />
                            <h2 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">{t("missionTitle")}</h2>
                            <p className="mt-3 text-lg text-pretty text-muted-foreground">{t("missionDescription")}</p>
                        </Reveal>
                    </div>
                </Container>
            </Section>

            <Section tone="sunk" aria-label={t("ctaTitle")}>
                <Container>
                    <Reveal>
                        <SectionHeader
                            align="center"
                            face="display"
                            title={t("ctaTitle")}
                            description={t("ctaDescription")}
                            className="mb-0 lg:mb-0"
                        />
                        <div className="mt-10 flex flex-wrap justify-center gap-3">
                            <Button asChild size="lg" className="group">
                                <Link href="/category">
                                    {t("ctaExplore")}
                                    <DirectionalArrow />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/contact">{t("ctaContact")}</Link>
                            </Button>
                        </div>
                    </Reveal>
                </Container>
            </Section>
        </>
    )
}
