import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { encodeSlug, numericLocale, resolveLocale } from "@repo/database"

import { Container, PageHeader, Section, SectionHeader } from "@/components/layout/section"
import { EmptyState } from "@/components/states"
import { ProductCard } from "@/components/product-card"
import { Link } from "@/i18n/navigation"
import { constructMetadata } from "@/lib/metadata"
import { allOffers } from "@/lib/services/offers-service"

/**
 * Everything on offer, in one place.
 *
 * The banner and the strip both point here, and this is the page that makes them worth
 * clicking: a discount that only exists as a struck price on a tile is findable only by people
 * who were already looking at that tile.
 *
 * It is DERIVED, never curated. There is no "featured on the offers page" flag to maintain —
 * a product is here because a discount covers it and the discount is running, and it leaves on
 * its own when the window closes. The alternative is a page somebody has to remember to empty.
 *
 * `revalidate` is 900 rather than the catalogue's 7200: this page's whole subject is something
 * that starts and ends on a clock, and fifteen minutes is the most staleness a claim about a
 * deadline can carry. What a customer is CHARGED is never stale — the checkout path is dynamic
 * and resolves prices at the moment of the order (ADR 0009).
 */
export const revalidate = 900

export async function generateMetadata(): Promise<Metadata> {
    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("offers")

    return constructMetadata({
        title: t("metaTitle"),
        description: t("metaDescription"),
        locale,
    })
}

export default async function OffersPage() {
    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("offers")
    const offers = await allOffers(locale)

    // The same digit system as the prices on this page (§4) — see `numericLocale`.
    const tag = numericLocale(locale)
    const number = new Intl.NumberFormat(tag)
    const date = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long" })

    return (
        <>
            <PageHeader
                title={t("pageTitle")}
                description={
                    offers
                        ? t("pageSummary", {
                              percent: number.format(offers.summary.percentOff),
                              count: offers.summary.productCount,
                              formattedCount: number.format(offers.summary.productCount),
                          })
                        : t("pageDescription")
                }
            />

            {!offers ? (
                <Section spacing="tight">
                    <Container>
                        {/*
                         * `no-data`, not `no-results`: nothing is filtered here. The collection
                         * is genuinely empty, and the action is to go and shop rather than to
                         * widen anything (§19).
                         */}
                        <EmptyState
                            variant="no-data"
                            title={t("emptyTitle")}
                            description={t("emptyDescription")}
                            action={
                                <Link
                                    href="/category"
                                    className="text-sm font-medium underline underline-offset-4"
                                >
                                    {t("browseCatalogue")}
                                </Link>
                            }
                        />
                    </Container>
                </Section>
            ) : (
                offers.groups.map((group) => (
                    <Section key={group.subCategoryId} spacing="tight">
                        <Container>
                            <SectionHeader
                                eyebrow={group.categoryName}
                                title={group.name}
                                description={t("sectionMeta", {
                                    percent: number.format(group.summary.percentOff),
                                    date: date.format(new Date(group.summary.endsAt)),
                                })}
                                action={
                                    <Link
                                        href={`/category/${encodeSlug(group.categorySlug)}/${encodeSlug(group.slug)}`}
                                        className="text-sm font-medium underline underline-offset-4"
                                    >
                                        {t("browseSection")}
                                    </Link>
                                }
                            />

                            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {group.products.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/category/${encodeSlug(group.categorySlug)}/${encodeSlug(group.slug)}/${encodeSlug(product.slug)}`}
                                        className="block"
                                    >
                                        <ProductCard
                                            image={product.images[0]?.url ?? "/lighting-product.jpg"}
                                            title={product.translations[0]?.name ?? product.productId}
                                            category={group.name}
                                            price={product.price}
                                            basePrice={product.basePrice}
                                            discountPercent={product.discountPercent}
                                        />
                                    </Link>
                                ))}
                            </div>
                        </Container>
                    </Section>
                ))
            )}
        </>
    )
}
