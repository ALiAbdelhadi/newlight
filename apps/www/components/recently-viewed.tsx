"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"

import { recentlyViewedCards } from "@/actions/merchandising"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { ProductCarousel } from "@/components/offers-carousel"
import type { StripCard } from "@/lib/services/merchandising-service"

/**
 * Recently viewed, the honest way.
 *
 * The browser remembers WHICH products (SKUs, in `localStorage`, newest first, twelve at most)
 * and nothing else. The cards — name, image, and above all price — are fetched fresh through a
 * server action on every render of the strip, so a discount that ended since the visit is
 * gone and a product that was retired is simply absent. A version that cached the card would
 * be a version that showed yesterday's price.
 *
 * It is per-browser by design. There is no account-level history in the schema and this does
 * not pretend there is; a customer who signs in on another device starts empty.
 */

const KEY = "newlight:recently-viewed"
const MAX = 12
const EVENT = "newlight:recently-viewed"

function read(): string[] {
    try {
        const raw = window.localStorage.getItem(KEY)
        const parsed: unknown = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : []
    } catch {
        return []
    }
}

function write(skus: string[]) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(skus.slice(0, MAX)))
        window.dispatchEvent(new Event(EVENT))
    } catch {
        // Private mode, quota, or storage disabled: the feature degrades to "nothing".
    }
}

/** A stable snapshot: the serialised list, so `useSyncExternalStore` compares by value. */
function subscribe(callback: () => void) {
    window.addEventListener("storage", callback)
    window.addEventListener(EVENT, callback)
    return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener(EVENT, callback)
    }
}
const getSnapshot = () => {
    try {
        return window.localStorage.getItem(KEY) ?? "[]"
    } catch {
        return "[]"
    }
}
const getServerSnapshot = () => "[]"

/** Mounted on a product page: records the visit. Renders nothing. */
export function RecordView({ sku }: { sku: string }) {
    useEffect(() => {
        write([sku, ...read().filter((entry) => entry !== sku)])
    }, [sku])
    return null
}

export function RecentlyViewed({ exclude, tone = "default" }: { exclude?: string; tone?: "default" | "sunk" }) {
    const t = useTranslations("merchandising.recentlyViewed")
    const serialised = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const [cards, setCards] = useState<StripCard[] | null>(null)

    const skus = (JSON.parse(serialised) as string[]).filter((sku) => sku !== exclude)
    const key = skus.join("|")

    useEffect(() => {
        if (!key) return
        let cancelled = false
        recentlyViewedCards(key.split("|")).then((result) => {
            if (!cancelled) setCards(result)
        })
        return () => {
            cancelled = true
        }
    }, [key])

    // Nothing stored, or the server has not answered yet: no section. The strip appears once
    // there is something to show, and never as an empty band with a heading. An empty key is
    // decided during render rather than by writing state from the effect.
    const visible = key ? cards : null
    if (!visible || visible.length === 0) return null

    return (
        <Section tone={tone} spacing="tight" aria-label={t("title")}>
            <Container>
                <SectionHeader
                    eyebrow={t("eyebrow")}
                    title={t("title")}
                    action={
                        <button
                            type="button"
                            onClick={() => write([])}
                            className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors duration-(--duration-fast) hover:text-foreground hover:underline"
                        >
                            {t("clear")}
                        </button>
                    }
                />
                <ProductCarousel products={visible} />
            </Container>
        </Section>
    )
}
