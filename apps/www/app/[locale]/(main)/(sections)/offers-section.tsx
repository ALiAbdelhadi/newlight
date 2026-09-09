import { encodeSlug, numericLocale, resolveLocale } from "@repo/database"
import { getLocale, getTranslations } from "next-intl/server"

import { Container, Section, SectionHeader } from "@/components/layout/section"
import { OffersCarousel, type OfferCard } from "@/components/offers-carousel"
import { Link } from "@/i18n/navigation"
import { allOffers } from "@/lib/services/offers-service"

/**
 * "There is a sale on" — on the page most people land on.
 *
 * The banner tells somebody already inside a section; this tells somebody who has just arrived,
 * which is the larger audience and the one that has not chosen anything yet. It is a row rather
 * than a grid because it sits three hundred pixels above the featured-products grid, and two
 * grids of the same card in a column read as one long list with a heading in the middle.
 *
 * IT RENDERS NOTHING WHEN NOTHING IS DISCOUNTED — no empty state, no "check back soon". A
 * homepage section that is sometimes an apology is a section that has to be maintained; this
 * one appears when a discount starts and is gone when it ends, and neither takes an edit.
 *
 * Capped at twelve. The offers page is the complete answer; this is the invitation to it, and a
 * strip of eighty products is a page nobody reaches the end of.
 */
const MAX_CARDS = 12

export async function OffersSection() {
    const locale = resolveLocale(await getLocale())
    const offers = await allOffers(locale)
    if (!offers) return null

    const t = await getTranslations("offers")
    const tag = numericLocale(locale)

    // Flattened round-robin across sections rather than group by group, so a sale covering one
    // large sub-category does not fill all twelve slots with one shelf of the shop.
    const cards: OfferCard[] = []
    for (let index = 0; cards.length < MAX_CARDS; index += 1) {
        const before = cards.length
        for (const group of offers.groups) {
            const product = group.products[index]
            if (!product || cards.length >= MAX_CARDS) continue
            cards.push({
                id: product.id,
                slug: encodeSlug(product.slug),
                name: product.translations[0]?.name ?? product.productId,
                image: product.images[0]?.url ?? "/lighting-product.jpg",
                section: group.name,
                categorySlug: encodeSlug(group.categorySlug),
                subCategorySlug: encodeSlug(group.slug),
                price: product.price,
                basePrice: product.basePrice,
                discountPercent: product.discountPercent,
            })
        }
        if (cards.length === before) break
    }

    return (
        <Section tone="sunk" spacing="tight" aria-label={t("pageTitle")}>
            <Container>
                <SectionHeader
                    eyebrow={t("pageTitle")}
                    title={t("homeTitle", {
                        percent: new Intl.NumberFormat(tag).format(offers.summary.percentOff),
                    })}
                    description={t("homeDescription", {
                        date: new Intl.DateTimeFormat(tag, { day: "numeric", month: "long" }).format(
                            new Date(offers.summary.endsAt)
                        ),
                    })}
                    action={
                        <Link
                            href="/offers"
                            className="text-sm font-medium underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-danger"
                        >
                            {t("seeAll")}
                        </Link>
                    }
                />

                <OffersCarousel products={cards} />
            </Container>
        </Section>
    )
}
