import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { ProductCarousel } from "@/components/offers-carousel"
import { Link } from "@/i18n/navigation"
import type { StripCard } from "@/lib/services/merchandising-service"

export function ProductStrip({
    cards,
    eyebrow,
    title,
    description,
    href,
    hrefLabel,
    tone = "default",
    className,
}: {
    cards: StripCard[]
    eyebrow: string
    title: string
    description?: string
    href?: string
    hrefLabel?: string
    tone?: "default" | "sunk"
    className?: string
}) {
    if (cards.length === 0) return null

    return (
        <Section tone={tone} spacing="tight" aria-label={title} className={className}>
            <Container>
                <SectionHeader
                    eyebrow={eyebrow}
                    title={title}
                    description={description}
                    action={
                        href && hrefLabel ? (
                            <Link
                                href={href}
                                className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                            >
                                {hrefLabel}
                                <DirectionalArrow />
                            </Link>
                        ) : undefined
                    }
                />
                <ProductCarousel products={cards} />
            </Container>
        </Section>
    )
}
