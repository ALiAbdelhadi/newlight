"use server"

import { getLocale } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { compareProducts, type CompareView } from "@/lib/services/compare-service"
import { COMPARE_MAX } from "@/lib/compare-limits"

export async function compareView(skus: unknown): Promise<CompareView> {
    if (!Array.isArray(skus)) return { products: [], rows: [] }
    const clean = skus
        .filter((sku): sku is string => typeof sku === "string" && sku.length > 0 && sku.length <= 64)
        .slice(0, COMPARE_MAX)

    const locale = resolveLocale(await getLocale())
    return compareProducts(clean, locale)
}
