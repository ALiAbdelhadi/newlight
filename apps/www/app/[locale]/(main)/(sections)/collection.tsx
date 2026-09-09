import { numericLocale, resolveLocale } from "@repo/database"
import { getLocale, getTranslations } from "next-intl/server"

import Image from "@/components/app-image"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { getCollectionCards } from "@/constants/collections"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const PLATES = [
    {
        span: "",
        ratio: "aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 46vw, 30vw",
    },
    {
        span: "",
        ratio: "aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 46vw, 30vw",
    },
    {
        span: "sm:col-span-2 lg:col-span-1",
        ratio: "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 94vw, 30vw",
    },
] as const

export async function Collection() {
    const locale = resolveLocale(await getLocale())

    const [t, root] = await Promise.all([getTranslations("collection-section"), getTranslations()])

    const plates = getCollectionCards(root)
        .filter((card) => card.featured)
        .slice(0, PLATES.length)
    if (plates.length === 0) return null

    const index = new Intl.NumberFormat(numericLocale(locale), {
        minimumIntegerDigits: 2,
        useGrouping: false,
    })

    return (
        <Section aria-label={t("sectionTitle")}>
            <Container>
                <SectionHeader
                    eyebrow={t("eyebrow")}
                    title={t("timeless-eleganceTitle")}
                    description={t("timeless-eleganceDescription")}
                    action={
                        <Link
                            href="/new-collection"
                            className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t("buttonText")}
                            <DirectionalArrow />
                        </Link>
                    }
                />

                <ul className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
                    {plates.map((plate, position) => {
                        const geometry = PLATES[position]!

                        return (
                            <Reveal as="li" key={plate.slug} index={position} className={geometry.span}>
                                <Link href="/new-collection" className="group block">
                                    <figure>
                                        <div
                                            className={cn(
                                                "relative overflow-hidden rounded-xl bg-surface-sunk",
                                                geometry.ratio
                                            )}
                                        >
                                            <Image
                                                alt=""
                                                src={plate.imageUrl}
                                                fill
                                                sizes={geometry.sizes}
                                                data-reveal-media
                                                className="object-cover transition-[scale,filter] duration-(--duration-slow) ease-out-fast group-hover:scale-[1.03]"
                                            />
                                        </div>

                                        <figcaption>
                                            <span className="mt-6 flex items-baseline gap-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                                                <span className="tabular">{index.format(position + 1)}</span>
                                                <span className="truncate">{plate.category}</span>
                                            </span>

                                            <span aria-hidden className="mt-3 block h-px w-full bg-border">
                                                <span className="block h-px w-full origin-left scale-x-0 bg-foreground transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-x-100 rtl:origin-right" />
                                            </span>

                                            <span className="mt-5 flex items-start justify-between gap-4">
                                                <span className="min-w-0">
                                                    <span className="block text-xl font-semibold tracking-tight text-balance lg:text-2xl">
                                                        {plate.title}
                                                    </span>
                                                    <span className="mt-2 block text-pretty text-muted-foreground">
                                                        {plate.shortDescription}
                                                    </span>
                                                </span>
                                                <DirectionalArrow variant="circled" className="mt-0.5" />
                                            </span>
                                        </figcaption>
                                    </figure>
                                </Link>
                            </Reveal>
                        )
                    })}
                </ul>
            </Container>
        </Section>
    )
}
