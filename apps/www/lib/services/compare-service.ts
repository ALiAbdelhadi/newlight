import { encodeSlug, prisma, type Locale, type SerializedMoney } from "@repo/database"

import { activeDiscounts } from "@/lib/discounts"
import { liveProduct, productSpecs, toCardView } from "./selectors"
import { translationsFor } from "@repo/database"

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
    specs: Record<string, string>
}

export interface CompareRow {
    key: string
    label: string
    values: Array<string | null>
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
                        specs: { include: { spec: true }, orderBy: { order: "asc" as const } },
                    },
                },
            },
        }),
        activeDiscounts(),
    ])

    const bySku = new Map(rows.map((row) => [row.productId, row]))
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
            if (values.every((value) => value === null)) return []
            const first = values[0]
            return [{ key, label: meta.label, values, identical: values.every((value) => value === first) }]
        })

    return { products, rows: specRows }
}
