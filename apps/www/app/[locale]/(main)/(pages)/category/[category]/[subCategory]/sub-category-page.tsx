"use client"

import { Container } from "@/components/layout/section"
import { ProductCard } from "@/components/product-card"
import { ProductFilterBar } from "@/components/product-filter-bar"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { CompareToggle } from "@/components/compare/compare-toggle"
import { CompareTray } from "@/components/compare/compare-tray"
import { EmptyState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import type { CategoryService } from "@/lib/services/category-service"
import {
    EMPTY_FILTERS,
    applyFilters,
    filtersFromParams,
    filtersToParams,
    quickSpecs,
    type ListingFilters,
} from "@/lib/services/product-facets"
import { encodeSlug, resolveLocale } from "@repo/database"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"

type SubCategoryView = NonNullable<Awaited<ReturnType<typeof CategoryService.getProductsWithUniqueVariants>>>

interface SubCategoryPageProps {
    subCategory: SubCategoryView
    categorySlug: string
    siblings?: Array<{ id: string; name: string; slug: string }>
}

export default function SectionTypePage({ subCategory, categorySlug, siblings = [] }: SubCategoryPageProps) {
    const t = useTranslations("section-type-page")
    const tm = useTranslations("merchandising")
    const locale = resolveLocale(useLocale())
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const subCategoryTranslation = subCategory.translations[0]
    const categoryTranslation = subCategory.category.translations[0]
    const subCategoryName = subCategoryTranslation?.name ?? ""
    const categoryName = categoryTranslation?.name ?? ""
    const subCategorySlug = subCategoryTranslation?.slug ?? ""

    const filters: ListingFilters = useMemo(
        () => filtersFromParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    )

    const visible = useMemo(() => applyFilters(subCategory.listing, filters), [subCategory.listing, filters])

    function updateFilters(next: ListingFilters) {
        const query = filtersToParams(next).toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }

    return (
        <div className="min-h-screen">
            <section className="py-10 lg:py-20">
                <Container>
                    <Breadcrumbs
                        className="mb-6 lg:mb-8"
                        items={[
                            { name: t("catalogue"), href: "/category" },
                            { name: categoryName, href: `/category/${encodeSlug(categorySlug)}` },
                            { name: subCategoryName },
                        ]}
                    />
                    <div className="max-w-3xl space-y-4 lg:space-y-6">
                        <div className="space-y-3 lg:space-y-4">
                            <h1 className="font-display text-3xl leading-[1.1] font-light tracking-tight text-balance sm:text-4xl lg:text-6xl">
                                {subCategoryName}
                            </h1>
                            <div className="h-px w-20 bg-accent" />
                        </div>
                        {subCategoryTranslation?.description && (
                            <p className="max-w-2xl text-base leading-relaxed font-light tracking-wide text-muted-foreground lg:text-lg">
                                {subCategoryTranslation.description}
                            </p>
                        )}
                    </div>
                    {siblings.length > 0 && (
                        <nav aria-label={tm("alsoIn", { category: categoryName })} className="mt-8 lg:mt-10">
                            <p className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                                {tm("alsoIn", { category: categoryName })}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                                {siblings.map((sibling) => (
                                    <li key={sibling.id}>
                                        <Link
                                            href={`/category/${encodeSlug(categorySlug)}/${encodeSlug(sibling.slug)}`}
                                            className="inline-flex h-9 items-center rounded-full border bg-card px-4 text-sm transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-accent"
                                        >
                                            <bdi dir="auto">{sibling.name}</bdi>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                </Container>
            </section>
            <section className="pb-16 lg:pb-28">
                <Container>
                    {subCategory.listing.length === 0 ? (
                        <EmptyState
                            variant="no-data"
                            title={t("noProducts")}
                            description={t("noProductsBody")}
                            action={
                                <Button asChild size="lg" className="group">
                                    <Link href={`/category/${encodeSlug(categorySlug)}`}>{categoryName}</Link>
                                </Button>
                            }
                            className="rounded-lg border bg-surface-sunk"
                        />
                    ) : (
                        <>
                            <ProductFilterBar
                                facets={subCategory.facets}
                                filters={filters}
                                resultCount={visible.length}
                                onChange={updateFilters}
                            />
                            {visible.length === 0 ? (
                                <EmptyState
                                    variant="no-results"
                                    title={t("noMatches")}
                                    description={t("noMatchesBody")}
                                    action={
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={() => updateFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
                                        >
                                            {t("clearAll")}
                                        </Button>
                                    }
                                    className="mt-10 rounded-lg border bg-surface-sunk"
                                />
                            ) : (
                                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
                                    {visible.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/category/${encodeSlug(categorySlug)}/${encodeSlug(subCategorySlug)}/${encodeSlug(product.slug)}`}
                                            className="block"
                                        >
                                            <ProductCard
                                                image={product.image ?? "/lighting-product.jpg"}
                                                title={product.name}
                                                category={subCategoryName}
                                                price={product.price}
                                                basePrice={product.basePrice}
                                                discountPercent={product.discountPercent}
                                                badge={product.isFeatured ? "Featured" : undefined}
                                                specs={quickSpecs(product, subCategory.definitions, locale)}
                                                stock={product.stockStatus}
                                                action={<CompareToggle sku={product.productId} />}
                                            />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </Container>
            </section>

            <CompareTray />
        </div>
    )
}