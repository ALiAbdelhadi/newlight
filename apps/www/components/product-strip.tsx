import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { ProductCarousel } from "@/components/offers-carousel"
import { Link } from "@/i18n/navigation"
import type { StripCard } from "@/lib/services/merchandising-service"

/**
 * THE product strip.
 *
 * One section shape for every "here are some products" moment on the site — new arrivals,
 * best sellers, related products, category highlights, category offers, recently viewed. A
 * `SectionHeader` with the eyebrow saying what the list is, the title saying it in words, an
 * optional link to the page that has all of it, and the carousel underneath.
 *
 * Renders NOTHING for an empty list. A strip with a heading and no cards is a promise the
 * catalogue is not keeping; the page simply gets shorter.
 */
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
