"use server"

import { getLocale } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { cardsForSkus, type StripCard } from "@/lib/services/merchandising-service"

const MAX_SKUS = 12

/**
 * Cards for "recently viewed", priced at the moment of asking.
 *
 * The browser sends SKUs and gets cards back; it never caches a price. Capped, and every entry
 * validated as a short string, because this is an endpoint and its argument is a request body.
 */
export async function recentlyViewedCards(skus: unknown): Promise<StripCard[]> {
    if (!Array.isArray(skus)) return []
    const clean = skus
        .filter((sku): sku is string => typeof sku === "string" && sku.length > 0 && sku.length <= 64)
        .slice(0, MAX_SKUS)
    const locale = resolveLocale(await getLocale())
    return cardsForSkus(clean, locale)
}
