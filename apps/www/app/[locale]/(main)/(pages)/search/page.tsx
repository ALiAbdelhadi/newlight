import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { encodeSlug, resolveLocale } from "@repo/database"

import { Container, PageHeader } from "@/components/layout/section"
import { DirectionalArrow } from "@/components/directional-arrow"
import { EmptyState } from "@/components/states"
import { SearchResults } from "@/components/search-results"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { SearchService, searchListing } from "@/lib/services/search-service"
import { constructMetadata } from "@/lib/metadata"
import type { SupportedLanguage } from "@/types"

/**
 * Search results, as a page.
 *
 * The storefront had search and could not show you its results. `SearchService.searchContent`
 * was written, localised and correct; `/api/search` served it; and the only thing that consumed
 * either was a sheet in the header that closed the moment you clicked anything. There was no
 * URL for a search, so a result set could not be linked, bookmarked, shared, opened in a new
 * tab, or returned to with the back button — the four things a person actually does with a
 * search on a shop.
 *
 * A SERVER COMPONENT reading `?q=`, so the query IS the address. No client fetch, no spinner,
 * and the empty state is decided on the server from the real result count.
 *
 * It searches three things because the service does: products, categories and sub-categories.
 * Someone typing "outdoor" wants the section, not eleven of its products; someone typing a SKU
 * wants the product. Both are answered on one page, products first.
 *
 * NOINDEX. Search result pages are the classic thin-content trap — infinite URLs, no unique
 * content of their own, and every one of them a duplicate of the catalogue. The catalogue and
 * the product pages are what should rank.
 */

export const dynamic = "force-dynamic"

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
    const { q } = await searchParams
    const t = await getTranslations("search")
    const locale = (await getLocale()) as SupportedLanguage

    return {
        ...constructMetadata({
            title: q ? t("resultsTitleFor", { query: q }) : t("resultsTitle"),
            description: t("resultsDescription"),
            locale,
        }),
        robots: { index: false, follow: true },
    }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams
    const query = (q ?? "").trim()
    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("search")

    /*
     * TWO reads, and deliberately: the taxonomy hits come from `searchContent`, and the product
     * hits come from `searchListing` in the shape the filter panel understands. One query
     * cannot serve both without either starving the filters or making the header's search
     * sheet pay for stock levels and specs it never renders.
     */
    const [results, listing] = await Promise.all([
        query
            ? SearchService.searchContent(query, locale, 48)
            : Promise.resolve({ products: [], categories: [], subCategories: [] }),
        query ? searchListing(query, locale, 48) : Promise.resolve(null),
    ])

    const taxonomy = [
        ...results.categories.map((c) => ({
            id: c.id,
            name: c.name,
            href: `/category/${encodeSlug(c.slug)}`,
            context: undefined as string | undefined,
        })),
        ...results.subCategories.map((s) => ({
            id: s.id,
            name: s.name,
            href: `/category/${encodeSlug(s.categorySlug ?? "")}/${encodeSlug(s.slug)}`,
            context: s.categoryName,
        })),
    ]

    // The COLLAPSED count — one card per family, which is what the page renders.
    const productCount = listing?.entries.length ?? 0
    const total = productCount + taxonomy.length

    return (
        <>
            <PageHeader
                eyebrow={t("eyebrow")}
                title={query ? t("resultsFor", { query }) : t("resultsTitle")}
                description={query ? t("count", { count: total }) : t("prompt")}
            />

            <Container className="py-10 lg:py-14">
                {/* No query at all — arrived from a bare /search link. Not an error, and not a
                    "no results" either: there is nothing to have results for yet. */}
                {!query ? (
                    <EmptyState
                        variant="no-results"
                        title={t("prompt")}
                        description={t("promptBody")}
                        action={
                            <Button asChild size="lg" className="group">
                                <Link href="/category">
                                    {t("browseInstead")}
                                    <DirectionalArrow />
                                </Link>
                            </Button>
                        }
                        className="rounded-lg border bg-surface-sunk"
                    />
                ) : total === 0 ? (
                    <EmptyState
                        variant="no-results"
                        title={t("noResults", { query })}
                        description={t("noResultsBody")}
                        action={
                            <Button asChild size="lg" className="group">
                                <Link href="/category">
                                    {t("browseInstead")}
                                    <DirectionalArrow />
                                </Link>
                            </Button>
                        }
                        className="rounded-lg border bg-surface-sunk"
                    />
                ) : (
                    <div className="space-y-14">
                        {/* Sections before products: a matching category is a better answer to a
                            broad term than the first four products inside it. */}
                        {taxonomy.length > 0 && (
                            <section aria-labelledby="search-sections">
                                <h2
                                    id="search-sections"
                                    className="mb-5 text-xs font-medium tracking-label text-muted-foreground uppercase"
                                >
                                    {t("sections")}
                                </h2>
                                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {taxonomy.map((entry) => (
                                        <li key={entry.id}>
                                            <Link
                                                href={entry.href}
                                                className="group flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-colors duration-(--duration-fast) hover:border-border-strong"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium">
                                                        <bdi dir="auto">{entry.name}</bdi>
                                                    </span>
                                                    {entry.context && (
                                                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                                                            <bdi dir="auto">{entry.context}</bdi>
                                                        </span>
                                                    )}
                                                </span>
                                                <DirectionalArrow variant="circled" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {listing && listing.entries.length > 0 && (
                            <section aria-labelledby="search-products">
                                <h2
                                    id="search-products"
                                    className="mb-5 text-xs font-medium tracking-label text-muted-foreground uppercase"
                                >
                                    {t("products", { count: listing.entries.length })}
                                </h2>
                                <SearchResults listing={listing} query={query} />
                            </section>
                        )}
                    </div>
                )}
            </Container>
        </>
    )
}
