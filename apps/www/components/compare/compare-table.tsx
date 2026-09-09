"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Image from "@/components/app-image"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

import { compareView } from "@/actions/compare"
import { DirectionalArrow } from "@/components/directional-arrow"
import { PriceTag } from "@/components/price-tag"
import { EmptyState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import {
    compareServerSnapshot,
    compareSnapshot,
    readCompare,
    subscribeCompare,
    writeCompare,
} from "@/lib/compare-store"
import type { CompareView } from "@/lib/services/compare-service"
import { cn } from "@/lib/utils"

/**
 * The comparison itself.
 *
 * The SELECTION is client state, because it is a per-browser scratchpad. Everything IN the
 * table is fetched from the server on every render of it, so a price here is the price the buy
 * button will charge and a spec is whatever the panel says today.
 *
 * `only differences` is the control that makes a table of twenty spec rows usable: on a family
 * of one fixture most rows are identical, and the two that are not are the entire question.
 */
export function CompareTable() {
    const t = useTranslations("compare")
    const serialised = useSyncExternalStore(subscribeCompare, compareSnapshot, compareServerSnapshot)
    const [view, setView] = useState<CompareView | null>(null)
    const [differencesOnly, setDifferencesOnly] = useState(false)

    const key = (JSON.parse(serialised) as string[]).join("|")

    useEffect(() => {
        if (!key) return
        let cancelled = false
        compareView(key.split("|")).then((result) => {
            if (!cancelled) setView(result)
        })
        return () => {
            cancelled = true
        }
    }, [key])

    /*
     * Three states, decided during render rather than by writing state from the effect:
     * nothing picked, picked but the server has not answered, and a table.
     */
    const empty = !key || (view !== null && view.products.length === 0)

    if (empty) {
        return (
            <EmptyState
                variant="no-data"
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                    <Button asChild size="lg" className="group">
                        <Link href="/category">
                            {t("browse")}
                            <DirectionalArrow />
                        </Link>
                    </Button>
                }
                className="rounded-lg border bg-surface-sunk"
            />
        )
    }

    if (!view) {
        return <div aria-hidden className="h-96 animate-pulse rounded-lg border bg-surface-sunk" />
    }

    const differing = view.rows.filter((row) => !row.identical)
    const rows = differencesOnly ? differing : view.rows
    const remove = (sku: string) => writeCompare(readCompare().filter((entry) => entry !== sku))

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {t("comparing", { count: view.products.length })}
                    {differing.length > 0 && ` · ${t("differenceCount", { count: differing.length })}`}
                </p>
                <div className="flex items-center gap-2">
                    {/* Only offered when it would change anything. */}
                    {differing.length > 0 && differing.length < view.rows.length && (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={differencesOnly}
                                onChange={(event) => setDifferencesOnly(event.target.checked)}
                                className="size-4 accent-[var(--primary)]"
                            />
                            {t("differencesOnly")}
                        </label>
                    )}
                    <Button variant="outline" size="sm" onClick={() => writeCompare([])}>
                        {t("clear")}
                    </Button>
                </div>
            </div>

            {/*
             * The table scrolls inside its own box rather than the page scrolling sideways, and
             * the first column is sticky so a spec label stays readable while the columns move.
             */}
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[40rem] border-collapse text-sm">
                    <caption className="sr-only">{t("title")}</caption>
                    <thead>
                        <tr className="align-top">
                            <th scope="col" className="sticky inset-s-0 z-10 w-40 bg-card p-4 text-start">
                                <span className="sr-only">{t("product")}</span>
                            </th>
                            {view.products.map((product) => (
                                <th key={product.id} scope="col" className="min-w-[13rem] border-s bg-card p-4 text-start font-normal">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={product.href} className="group block min-w-0">
                                                <span className="relative block aspect-square w-full overflow-hidden rounded-md border bg-surface-sunk">
                                                    {product.image && (
                                                        <Image
                                                            src={product.image}
                                                            alt=""
                                                            fill
                                                            sizes="208px"
                                                            className="object-contain p-3 transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-105"
                                                        />
                                                    )}
                                                </span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => remove(product.sku)}
                                                aria-label={t("removeOne", { name: product.name })}
                                                className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-accent hover:text-danger"
                                            >
                                                <X aria-hidden className="size-4" />
                                            </button>
                                        </div>
                                        <span className="block text-xs text-muted-foreground">
                                            <bdi dir="auto">{product.section}</bdi>
                                        </span>
                                        <Link href={product.href} className="block font-medium hover:underline underline-offset-4">
                                            <bdi dir="auto">{product.name}</bdi>
                                        </Link>
                                        <PriceTag price={product.price} basePrice={product.basePrice} size="sm" />
                                        <span
                                            className={cn(
                                                "block text-xs font-medium",
                                                product.inStock ? "text-success" : "text-danger"
                                            )}
                                        >
                                            {product.inStock ? t("inStock") : t("outOfStock")}
                                        </span>
                                        <Button asChild size="sm" variant="outline" className="group w-full">
                                            <Link href={product.href}>
                                                {t("view")}
                                                <DirectionalArrow />
                                            </Link>
                                        </Button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key} className="border-t">
                                <th
                                    scope="row"
                                    className="sticky inset-s-0 z-10 bg-card p-4 text-start align-top text-xs font-medium tracking-label text-muted-foreground uppercase"
                                >
                                    <bdi dir="auto">{row.label}</bdi>
                                </th>
                                {row.values.map((value, index) => (
                                    <td
                                        key={`${row.key}-${view.products[index]?.id ?? index}`}
                                        className={cn(
                                            "border-s p-4 align-top tabular-nums",
                                            // A row where everything agrees is context, not an
                                            // answer; the eye should skip it.
                                            row.identical && "text-muted-foreground"
                                        )}
                                    >
                                        {value ? <bdi dir="auto">{value}</bdi> : <span aria-hidden>—</span>}
                                        {!value && <span className="sr-only">{t("notSpecified")}</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rows.length === 0 && (
                <p className="rounded-lg border bg-surface-sunk p-6 text-center text-sm text-muted-foreground">
                    {t("identical")}
                </p>
            )}
        </div>
    )
}
