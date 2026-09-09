import { Prisma, prisma, resolveEffectivePrice, type ActiveDiscount, type Locale } from "@repo/database"

import { activeDiscounts } from "@/lib/discounts"
import { liveProduct, productLinkedCardInclude, toCardView, type CardView } from "./selectors"

export interface OfferSummary {
    percentOff: number
    productCount: number
    endsAt: string
}

export interface OfferGroup {
    subCategoryId: string
    name: string
    slug: string
    categoryName: string
    categorySlug: string
    summary: OfferSummary
    products: Array<CardView<Prisma.ProductGetPayload<{ include: ReturnType<typeof productLinkedCardInclude> }>>>
}

type PricedRow = { id: string; familyId: string | null; subCategoryId: string; price: Prisma.Decimal }

function whereForDiscounts(discounts: readonly ActiveDiscount[]): Prisma.ProductWhereInput | null {
    if (discounts.length === 0) return null
    if (discounts.some((discount) => discount.scopeType === "ALL")) return { ...liveProduct }

    const subCategoryIds = new Set<string>()
    const familyIds = new Set<string>()
    const productIds = new Set<string>()

    for (const discount of discounts) {
        discount.subCategoryIds.forEach((id) => subCategoryIds.add(id))
        if (discount.familyId) familyIds.add(discount.familyId)
        discount.productIds.forEach((id) => productIds.add(id))
    }

    const or: Prisma.ProductWhereInput[] = []
    if (subCategoryIds.size > 0) or.push({ subCategoryId: { in: [...subCategoryIds] } })
    if (familyIds.size > 0) or.push({ familyId: { in: [...familyIds] } })
    if (productIds.size > 0) or.push({ id: { in: [...productIds] } })
    if (or.length === 0) return null

    return { ...liveProduct, OR: or }
}

export function summariseOffers(rows: readonly PricedRow[], discounts: readonly ActiveDiscount[]): OfferSummary | null {
    let percentOff = 0
    let endsAt: Date | null = null
    const counted = new Set<string>()

    for (const row of rows) {
        const priced = resolveEffectivePrice(row.price, row, discounts)
        if (!priced.discount) continue

        counted.add(row.familyId ?? row.id)
        percentOff = Math.max(percentOff, priced.percentOff)
        if (endsAt === null || priced.discount.endsAt < endsAt) endsAt = priced.discount.endsAt
    }

    if (counted.size === 0 || endsAt === null) return null
    return { percentOff, productCount: counted.size, endsAt: endsAt.toISOString() }
}

export async function offersHighlight(): Promise<OfferSummary | null> {
    const discounts = await activeDiscounts()
    const where = whereForDiscounts(discounts)
    if (!where) return null

    const rows = await prisma.product.findMany({
        where,
        select: { id: true, familyId: true, subCategoryId: true, price: true },
    })
    return summariseOffers(rows, discounts)
}

export async function offersForSection(
    scope: { subCategoryId: string } | { categoryId: string }
): Promise<OfferSummary | null> {
    const discounts = await activeDiscounts()
    if (discounts.length === 0) return null

    const rows = await prisma.product.findMany({
        where:
            "subCategoryId" in scope
                ? { ...liveProduct, subCategoryId: scope.subCategoryId }
                : { ...liveProduct, subCategory: { categoryId: scope.categoryId } },
        select: { id: true, familyId: true, subCategoryId: true, price: true },
    })
    return summariseOffers(rows, discounts)
}

export async function allOffers(locale: Locale): Promise<{ summary: OfferSummary; groups: OfferGroup[] } | null> {
    const discounts = await activeDiscounts()
    const where = whereForDiscounts(discounts)
    if (!where) return null

    const products = await prisma.product.findMany({
        where,
        include: productLinkedCardInclude(locale),
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
    })

    const summary = summariseOffers(products, discounts)
    if (!summary) return null

    const groups = new Map<string, OfferGroup>()
    const seen = new Set<string>()
    for (const product of products) {
        const priced = resolveEffectivePrice(product.price, product, discounts)
        if (!priced.discount) continue

        const key = product.familyId ?? product.id
        if (seen.has(key)) continue
        seen.add(key)

        const subCategory = product.subCategory
        const group = groups.get(subCategory.id)
        const card = toCardView(product, discounts)

        if (group) {
            group.products.push(card)
            continue
        }

        groups.set(subCategory.id, {
            subCategoryId: subCategory.id,
            name: subCategory.translations[0]?.name ?? "",
            slug: subCategory.translations[0]?.slug ?? "",
            categoryName: subCategory.category.translations[0]?.name ?? "",
            categorySlug: subCategory.category.translations[0]?.slug ?? "",
            summary: { percentOff: 0, productCount: 0, endsAt: summary.endsAt },
            products: [card],
        })
    }

    const rowsById = new Map(products.map((product) => [product.id, product]))
    for (const group of groups.values()) {
        const rows = group.products.flatMap((card) => {
            const row = rowsById.get(card.id)
            return row ? [row] : []
        })
        group.summary = summariseOffers(rows, discounts) ?? group.summary
    }

    return { summary, groups: [...groups.values()] }
}
