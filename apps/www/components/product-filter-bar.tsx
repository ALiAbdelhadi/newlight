"use client"

import { useState, useSyncExternalStore } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
    EMPTY_FILTERS,
    SORT_KEYS,
    activeFilterCount,
    type FacetOption,
    type ListingFilters,
    type ProductFacets,
    type SortKey,
} from "@/lib/services/product-facets"

interface ProductFilterBarProps {
    facets: ProductFacets
    filters: ListingFilters
    resultCount: number
    onChange: (next: ListingFilters) => void
}

function useIsDesktop(): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const query = window.matchMedia("(min-width: 1024px)")
            query.addEventListener("change", onChange)
            return () => query.removeEventListener("change", onChange)
        },
        () => window.matchMedia("(min-width: 1024px)").matches,
        () => false
    )
}

export function ProductFilterBar({ facets, filters, resultCount, onChange }: ProductFilterBarProps) {
    const t = useTranslations("plp")
    const isDesktop = useIsDesktop()
    const [open, setOpen] = useState(false)
    const active = activeFilterCount(filters)

    const toggle = (key: "colorTemperatures" | "colors", value: string) => {
        const current = filters[key]
        onChange({
            ...filters,
            [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
        })
    }

    const toggleSpec = (specKey: string, value: string) => {
        const current = filters.specs[specKey] ?? []
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
        const specs = { ...filters.specs }
        if (next.length) specs[specKey] = next
        else delete specs[specKey]
        onChange({ ...filters, specs })
    }

    const hasFacets =
        facets.colorTemperatures.length > 0 ||
        facets.colors.length > 0 ||
        facets.specs.length > 0 ||
        facets.inStock > 0 ||
        facets.onSale > 0

    const clearAll = () => onChange({ ...EMPTY_FILTERS, sort: filters.sort })

    const panel = (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {facets.colorTemperatures.length > 0 && (
                <FacetGroup
                    legend={t("colorTemperature")}
                    options={facets.colorTemperatures}
                    selected={filters.colorTemperatures}
                    onToggle={(value) => toggle("colorTemperatures", value)}
                />
            )}

            {facets.colors.length > 0 && (
                <FacetGroup
                    legend={t("finish")}
                    options={facets.colors}
                    selected={filters.colors}
                    onToggle={(value) => toggle("colors", value)}
                    swatches
                />
            )}

            {facets.specs.map((spec) => (
                <FacetGroup
                    key={spec.key}
                    legend={spec.unit ? `${spec.label} (${spec.unit})` : spec.label}
                    options={spec.options}
                    selected={filters.specs[spec.key] ?? []}
                    onToggle={(value) => toggleSpec(spec.key, value)}
                />
            ))}

            {(facets.inStock > 0 || facets.onSale > 0) && (
                <fieldset className="min-w-0">
                    <legend className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                        {t("availability")}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {facets.inStock > 0 && (
                            <Chip
                                selected={filters.inStockOnly}
                                count={facets.inStock}
                                onToggle={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
                            >
                                {t("inStock")}
                            </Chip>
                        )}
                        {facets.onSale > 0 && (
                            <Chip
                                selected={filters.onSaleOnly}
                                count={facets.onSale}
                                onToggle={() => onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
                            >
                                {t("onSale")}
                            </Chip>
                        )}
                    </div>
                </fieldset>
            )}
        </div>
    )

    const sortSelect = (
        <label className="flex min-w-0 flex-1 items-center lg:flex-none">
            <span className="sr-only">{t("sortBy")}</span>
            <select
                value={filters.sort}
                onChange={(event) => onChange({ ...filters, sort: event.target.value as SortKey })}
                aria-label={t("sortBy")}
                className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-colors duration-(--duration-fast) focus-visible:border-ring lg:w-52"
            >
                {SORT_KEYS.map((key) => (
                    <option key={key} value={key}>
                        {t(`sort.${key}`)}
                    </option>
                ))}
            </select>
        </label>
    )

    const filterButton = (
        <Button
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="product-filters"
            className="h-11 min-w-0 flex-1 gap-2 lg:flex-none"
        >
            <SlidersHorizontal aria-hidden className="size-4" />
            {t("filters")}
            {active > 0 && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-xs font-medium tabular-nums text-primary-foreground">
                    {active}
                </span>
            )}
        </Button>
    )

    return (
        <div className="border-b pb-5">
            <div className="sticky top-16 z-30 -mx-5 bg-background/95 px-5 py-3 backdrop-blur-sm lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                        {t("results", { count: resultCount })}
                        {active > 0 && (
                            <span className="text-muted-foreground"> {t("ofTotal", { total: facets.total })}</span>
                        )}
                    </p>

                    <div className="flex items-center gap-2">
                        {hasFacets && filterButton}
                        {sortSelect}
                    </div>
                </div>
            </div>

            {isDesktop && open && hasFacets && (
                <div id="product-filters" className="mt-6">
                    {panel}
                </div>
            )}

            <Sheet open={!isDesktop && open && hasFacets} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="flex max-h-[85svh] flex-col gap-0 p-0">
                    <SheetHeader className="flex-row items-center justify-between border-b p-5">
                        <SheetTitle>{t("filters")}</SheetTitle>
                        {active > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                                {t("clearAll")}
                            </Button>
                        )}
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-5">{panel}</div>

                    <div className="border-t p-5">
                        <Button className="h-12 w-full" onClick={() => setOpen(false)}>
                            {t("showResults", { count: resultCount })}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {active > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {filters.colorTemperatures.map((value) => (
                        <ActiveChip key={value} onRemove={() => toggle("colorTemperatures", value)}>
                            {facets.colorTemperatures.find((o) => o.value === value)?.label ?? value}
                        </ActiveChip>
                    ))}
                    {filters.colors.map((value) => (
                        <ActiveChip key={value} onRemove={() => toggle("colors", value)}>
                            {facets.colors.find((o) => o.value === value)?.label ?? value}
                        </ActiveChip>
                    ))}
                    {Object.entries(filters.specs).flatMap(([specKey, values]) => {
                        const facet = facets.specs.find((f) => f.key === specKey)
                        return values.map((value) => (
                            <ActiveChip key={`${specKey}:${value}`} onRemove={() => toggleSpec(specKey, value)}>
                                {facet?.unit ? `${value} ${facet.unit}` : value}
                            </ActiveChip>
                        ))
                    })}
                    {filters.inStockOnly && (
                        <ActiveChip onRemove={() => onChange({ ...filters, inStockOnly: false })}>
                            {t("inStock")}
                        </ActiveChip>
                    )}
                    {filters.onSaleOnly && (
                        <ActiveChip onRemove={() => onChange({ ...filters, onSaleOnly: false })}>
                            {t("onSale")}
                        </ActiveChip>
                    )}

                    <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                        {t("clearAll")}
                    </Button>
                </div>
            )}
        </div>
    )
}

function FacetGroup({
    legend,
    options,
    selected,
    onToggle,
    swatches = false,
}: {
    legend: string
    options: FacetOption[]
    selected: string[]
    onToggle: (value: string) => void
    swatches?: boolean
}) {
    return (
        <fieldset className="min-w-0">
            <legend className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                {legend}
            </legend>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Chip
                        key={option.value}
                        selected={selected.includes(option.value)}
                        count={option.count}
                        onToggle={() => onToggle(option.value)}
                    >
                        {swatches && option.hex && (
                            <span
                                aria-hidden
                                style={{ background: option.hex }}
                                className="size-3 shrink-0 rounded-full border border-border-strong"
                            />
                        )}
                        {option.label}
                    </Chip>
                ))}
            </div>
        </fieldset>
    )
}

function Chip({
    selected,
    count,
    onToggle,
    children,
}: {
    selected: boolean
    count: number
    onToggle: () => void
    children: React.ReactNode
}) {
    return (
        <label
            className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                "transition-colors duration-(--duration-fast)",
                selected
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border hover:border-border-strong"
            )}
        >
            <input type="checkbox" checked={selected} onChange={onToggle} className="sr-only" />
            {children}
            <span className="tabular-nums text-muted-foreground">{count}</span>
        </label>
    )
}

function ActiveChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
    const t = useTranslations("plp")
    return (
        <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary-soft px-3 py-1.5 text-sm transition-colors duration-(--duration-fast) hover:border-border-strong"
        >
            {children}
            <X aria-hidden className="size-3.5" />
            <span className="sr-only">{t("remove")}</span>
        </button>
    )
}
