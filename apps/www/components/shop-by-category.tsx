import Image from "@/components/app-image"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { Link } from "@/i18n/navigation"
import { subCategoryTiles } from "@/lib/services/merchandising-service"
import { resolveLocale } from "@repo/database"
import { getLocale, getTranslations } from "next-intl/server"

export async function ShopByCategory() {
    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("merchandising.shopByCategory")
    const tiles = await subCategoryTiles(locale)
    if (tiles.length === 0) return null

    const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB")

    return (
        <Section spacing="tight" aria-label={t("title")}>
            <Container>
                <SectionHeader
                    eyebrow={t("eyebrow")}
                    title={t("title")}
                    description={t("description")}
                    action={
                        <Link
                            href="/category"
                            className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t("all")}
                            <DirectionalArrow />
                        </Link>
                    }
                />

                <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
                    {tiles.map((tile, index) => (
                        <Reveal as="li" key={tile.id} index={index}>
                            <Link
                                href={tile.href}
                                className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-[box-shadow,translate,scale] duration-(--duration-base) ease-out-fast hover:-translate-y-0.5 hover:shadow-overlay"
                            >
                                <div className="relative aspect-square overflow-hidden bg-surface-sunk">
                                    {tile.imageUrl ? (
                                        <Image
                                            src={tile.imageUrl}
                                            alt=""
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 16vw"
                                            className="object-cover transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-[1.04]"
                                        />
                                    ) : null}
                                </div>
                                <div className="flex flex-1 items-end justify-between gap-2 p-4">
                                    <span className="min-w-0">
                                        <span className="block text-xs text-muted-foreground">
                                            <bdi dir="auto">{tile.parent}</bdi>
                                        </span>
                                        <span className="mt-0.5 block truncate font-medium">
                                            <bdi dir="auto">{tile.name}</bdi>
                                        </span>
                                        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                                            {t("count", { count: tile.count, formattedCount: number.format(tile.count) })}
                                        </span>
                                    </span>
                                    <DirectionalArrow variant="circled" className="mb-0.5" />
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                </ul>
            </Container>
        </Section>
    )
}
