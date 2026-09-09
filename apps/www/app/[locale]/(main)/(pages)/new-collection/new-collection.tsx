import Image from "@/components/app-image"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, PageHeader, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { EmptyState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

interface CollectionCard {
    slug: string
    title: string
    shortDescription: string
    imageUrl: string
    imageAlt: string
    category: string
    tags: string[]
    featured?: boolean
}

interface NewCollectionProps {
    filteredCollections: CollectionCard[]
    allCollectionsCount: number
    featuredCollection?: CollectionCard
    category?: string
    tag?: string
    search?: string
    translations: {
        eyebrow: string
        heroTitle: string
        heroDescription: string
        featuredButton: string
        filteredResults: string
        allProjects: string
        showing: string
        of: string
        projects: string
        clearFilters: string
        noProjects: string
        viewAll: string
        ctaTitle: string
        ctaDescription: string
        ctaButton: string
    }
}

export default function NewCollection({
    filteredCollections,
    allCollectionsCount,
    category,
    tag,
    search,
    translations: t,
}: NewCollectionProps) {
    const filtered = Boolean(category || tag || search)

    return (
        <>
            <PageHeader
                eyebrow={t.eyebrow}
                title={t.heroTitle}
                description={t.heroDescription}
                action={
                    filtered ? (
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>
                                {t.showing} {filteredCollections.length} {t.of} {allCollectionsCount} {t.projects}
                            </span>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/new-collection">{t.clearFilters}</Link>
                            </Button>
                        </div>
                    ) : undefined
                }
            />

            <Section spacing="tight">
                <Container>
                    {filteredCollections.length === 0 ? (
                        <EmptyState
                            variant={filtered ? "no-results" : "no-data"}
                            title={t.noProjects}
                            action={
                                filtered ? (
                                    <Button asChild variant="outline">
                                        <Link href="/new-collection">{t.clearFilters}</Link>
                                    </Button>
                                ) : undefined
                            }
                            className="rounded-lg border bg-surface-sunk"
                        />
                    ) : (
                        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                            {filteredCollections.map((collection, index) => (
                                <Reveal as="li" key={collection.slug} index={index}>
                                    <article className="group overflow-hidden rounded-lg border bg-card transition-[box-shadow,translate,scale] duration-(--duration-base) ease-out-fast hover:-translate-y-0.5 hover:shadow-overlay">
                                        <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunk">
                                            <Image
                                                src={collection.imageUrl}
                                                alt={collection.imageAlt}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-[1.03]"
                                            />
                                        </div>
                                        <div className="space-y-3 p-6">
                                            <p className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                                                {collection.category}
                                            </p>
                                            <h2 className="text-xl font-semibold tracking-tight">{collection.title}</h2>
                                            <p className="text-pretty text-muted-foreground">{collection.shortDescription}</p>
                                            {collection.tags.length > 0 && (
                                                <ul className="flex flex-wrap gap-2 pt-1">
                                                    {collection.tags.map((label) => (
                                                        <li
                                                            key={label}
                                                            className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                                                        >
                                                            {label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </article>
                                </Reveal>
                            ))}
                        </ul>
                    )}
                </Container>
            </Section>

            <Section tone="sunk" aria-label={t.ctaTitle}>
                <Container>
                    <SectionHeader
                        align="center"
                        face="display"
                        title={t.ctaTitle}
                        description={t.ctaDescription}
                        className="mb-0 lg:mb-0"
                    />
                    <div className="mt-10 text-center">
                        <Button asChild size="lg" className="group">
                            <Link href="/contact">
                                {t.ctaButton}
                                <DirectionalArrow />
                            </Link>
                        </Button>
                    </div>
                </Container>
            </Section>
        </>
    )
}
