import type { DiscountKind, DiscountScopeType, Prisma, PrismaClient } from "@prisma/client"
import {
    compareMoney,
    money,
    roundMoney,
    serializeMoney,
    subtractMoney,
    type Money,
    type MoneyInput,
    type SerializedMoney,
} from "./money"

type Client = PrismaClient | Prisma.TransactionClient

export const MIN_EFFECTIVE_PRICE: SerializedMoney = "0.01"

export interface ActiveDiscount {
    id: string
    name: string
    kind: DiscountKind
    value: SerializedMoney
    scopeType: DiscountScopeType
    subCategoryIds: readonly string[]
    familyId: string | null
    productIds: readonly string[]
    startsAt: Date
    endsAt: Date
}

export interface DiscountableProduct {
    id: string
    familyId: string | null
    subCategoryId: string
}

export interface EffectivePrice {
    base: SerializedMoney
    effective: SerializedMoney
    saving: SerializedMoney
    percentOff: number
    discount: {
        id: string
        name: string
        kind: DiscountKind
        value: SerializedMoney
        endsAt: Date
    } | null
}

export async function loadActiveDiscounts(client: Client, at: Date = new Date()): Promise<ActiveDiscount[]> {
    const rows = await client.discount.findMany({
        where: {
            isActive: true,
            startsAt: { lte: at },
            endsAt: { gt: at },
        },
        select: {
            id: true,
            name: true,
            kind: true,
            value: true,
            scopeType: true,
            categoryId: true,
            subCategoryId: true,
            familyId: true,
            startsAt: true,
            endsAt: true,
            products: { select: { productId: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    if (rows.length === 0) return []

    const categoryIds = rows.map((row) => row.categoryId).filter((id): id is string => id !== null)
    const byCategory = new Map<string, string[]>()
    if (categoryIds.length > 0) {
        const subCategories = await client.subCategory.findMany({
            where: { categoryId: { in: categoryIds }, deletedAt: null },
            select: { id: true, categoryId: true },
        })
        for (const sub of subCategories) {
            const list = byCategory.get(sub.categoryId)
            if (list) list.push(sub.id)
            else byCategory.set(sub.categoryId, [sub.id])
        }
    }

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        value: serializeMoney(row.value),
        scopeType: row.scopeType,
        subCategoryIds:
            row.scopeType === "CATEGORY"
                ? (byCategory.get(row.categoryId!) ?? [])
                : row.subCategoryId
                  ? [row.subCategoryId]
                  : [],
        familyId: row.familyId,
        productIds: row.products.map((link) => link.productId),
        startsAt: row.startsAt,
        endsAt: row.endsAt,
    }))
}

export function discountApplies(discount: ActiveDiscount, product: DiscountableProduct): boolean {
    switch (discount.scopeType) {
        case "ALL":
            return true
        case "CATEGORY":
        case "SUB_CATEGORY":
            return discount.subCategoryIds.includes(product.subCategoryId)
        case "FAMILY":
            return product.familyId !== null && product.familyId === discount.familyId
        case "PRODUCTS":
            return discount.productIds.includes(product.id)
        default:
            return false
    }
}

export function scopeSpecificity(scopeType: DiscountScopeType): number {
    switch (scopeType) {
        case "PRODUCTS":
            return 4
        case "FAMILY":
            return 3
        case "SUB_CATEGORY":
            return 2
        case "CATEGORY":
            return 1
        default:
            return 0
    }
}

export function applyDiscount(price: MoneyInput, discount: Pick<ActiveDiscount, "kind" | "value">): Money {
    const base = money(price)
    const raw =
        discount.kind === "PERCENT"
            ? base.minus(base.times(money(discount.value)).dividedBy(100))
            : base.minus(money(discount.value))

    const rounded = roundMoney(raw)
    return compareMoney(rounded, MIN_EFFECTIVE_PRICE) < 0 ? money(MIN_EFFECTIVE_PRICE) : rounded
}

export function resolveEffectivePrice(
    price: MoneyInput,
    product: DiscountableProduct,
    discounts: readonly ActiveDiscount[]
): EffectivePrice {
    const base = roundMoney(price)
    const none: EffectivePrice = {
        base: serializeMoney(base),
        effective: serializeMoney(base),
        saving: "0.00",
        percentOff: 0,
        discount: null,
    }

    let winner: ActiveDiscount | null = null
    let winningPrice: Money | null = null

    for (const discount of discounts) {
        if (!discountApplies(discount, product)) continue

        const candidate = applyDiscount(base, discount)
        if (compareMoney(candidate, base) >= 0) continue

        if (
            winningPrice === null ||
            compareMoney(candidate, winningPrice) < 0 ||
            (compareMoney(candidate, winningPrice) === 0 &&
                scopeSpecificity(discount.scopeType) > scopeSpecificity(winner!.scopeType))
        ) {
            winner = discount
            winningPrice = candidate
        }
    }

    if (!winner || !winningPrice) return none

    const saving = subtractMoney(base, winningPrice)
    return {
        base: serializeMoney(base),
        effective: serializeMoney(winningPrice),
        saving: serializeMoney(saving),
        percentOff: Math.round(saving.dividedBy(base).times(100).toNumber()),
        discount: {
            id: winner.id,
            name: winner.name,
            kind: winner.kind,
            value: winner.value,
            endsAt: winner.endsAt,
        },
    }
}

export async function effectivePriceFor(
    client: Client,
    product: DiscountableProduct & { price: MoneyInput },
    at: Date = new Date()
): Promise<EffectivePrice> {
    const discounts = await loadActiveDiscounts(client, at)
    return resolveEffectivePrice(product.price, product, discounts)
}
