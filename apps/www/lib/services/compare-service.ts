import { encodeSlug, prisma, type Locale, type SerializedMoney } from "@repo/database"

import { activeDiscounts } from "@/lib/discounts"
import { liveProduct, productSpecs, toCardView } from "./selectors"
import { translationsFor } from "@repo/database"

/**
 * The rows a comparison table is built from.
 *
 * A comparison is the one screen where this catalogue's data earns its shape: `ProductSpec`
 * holds a typed value per product and `SubCategorySpec` holds the operator's order for them, so
 * "wattage, lumens, beam angle, IP rating, side by side" is a join, not a feature to invent.
 * The storefront was loading those specs on every listing page and rendering none of them.
 *
 * Unlike a listing, this does NOT collapse a family: comparing the 6W against the 30W of one
 * fixture is exactly the question a specifier has, and folding them into one row would answer
 * it with "6-30".
 */
export interface CompareProduct {
    id: string
    sku: string
    name: string
    image: string | null
    href: string
    price: SerializedMoney
    basePrice: SerializedMoney
    discountPercent: number
    inStock: boolean
    section: string
    /** Spec key → the value as it should read, unit folded in. */
    specs: Record<string, string>
}

export interface CompareRow {
    key: string
    label: string
    /** Aligned with `products`; null where a product does not declare the spec. */
    values: Array<string | null>
    /** True when every product answers the same — used to fold the row away. */
    identical: boolean
}

export interface CompareView {
    products: CompareProduct[]
    rows: CompareRow[]
}

const PLACEHOLDER = "-"

export async function compareProducts(skus: readonly string[], locale: Locale): Promise<CompareView> {
    if (skus.length === 0) return { products: [], rows: [] }

    const [rows, discounts] = await Promise.all([
        prisma.product.findMany({
            where: { productId: { in: [...skus] }, ...liveProduct },
            include: {
                translations: translationsFor(locale),
                images: { orderBy: { order: "asc" as const }, take: 1 },
                specs: productSpecs,
                stockLevels: { select: { onHand: true, reserved: true } },
                subCategory: {
                    include: {
                        translations: translationsFor(locale),
                        category: { include: { translations: translationsFor(locale) } },
                        // The operator's spec order for this section, which is the order the
                        // table's rows appear in.
                        specs: { include: { spec: true }, orderBy: { order: "asc" as const } },
                    },
                },
            },
        }),
        activeDiscounts(),
    ])

    const bySku = new Map(rows.map((row) => [row.productId, row]))
    // The customer's order, not the database's: the columns stay in the order they were picked.
    const ordered = skus.flatMap((sku) => {
        const row = bySku.get(sku)
        return row ? [row] : []
    })

    const labels = new Map<string, { label: string; order: number }>()
    const products: CompareProduct[] = ordered.map((row) => {
        const priced = toCardView(row, discounts)
        const specs: Record<string, string> = {}

        for (const declared of row.subCategory.specs) {
            const existing = labels.get(declared.specKey)
            const order = declared.order
            if (!existing || order < existing.order) {
                labels.set(declared.specKey, {
                    label: locale === "ar" ? declared.spec.labelAr : declared.spec.labelEn,
                    order,
                })
            }
        }

        for (const spec of row.specs) {
            const value = locale === "ar" ? spec.valueAr : spec.valueEn
            if (!value || value === PLACEHOLDER) continue
            const unit = locale === "ar" ? spec.spec.unitAr : spec.spec.unitEn
            specs[spec.specKey] = unit ? `${value} ${unit}` : value
            // A product can carry a spec its section never declared; it still deserves a row.
            if (!labels.has(spec.specKey)) {
                labels.set(spec.specKey, {
                    label: locale === "ar" ? spec.spec.labelAr : spec.spec.labelEn,
                    order: Number.MAX_SAFE_INTEGER,
                })
            }
        }

        const available = row.stockLevels.reduce((total, level) => total + level.onHand - level.reserved, 0)
        const category = row.subCategory.category.translations[0]?.slug ?? ""
        const section = row.subCategory.translations[0]

        return {
            id: row.id,
            sku: row.productId,
            name: row.translations[0]?.name ?? row.productId,
            image: row.images[0]?.url ?? null,
            href: `/category/${encodeSlug(category)}/${encodeSlug(section?.slug ?? "")}/${encodeSlug(row.slug)}`,
            price: priced.price,
            basePrice: priced.basePrice,
            discountPercent: priced.discountPercent,
            inStock: available > 0,
            section: section?.name ?? "",
            specs,
        }
    })

    const specRows: CompareRow[] = [...labels.entries()]
        .sort((a, b) => a[1].order - b[1].order || a[1].label.localeCompare(b[1].label))
        .flatMap(([key, meta]) => {
            const values = products.map((product) => product.specs[key] ?? null)
            // A row nobody answers is not a difference, it is an empty row.
            if (values.every((value) => value === null)) return []
            const first = values[0]
            return [{ key, label: meta.label, values, identical: values.every((value) => value === first) }]
        })

    return { products, rows: specRows }
}
