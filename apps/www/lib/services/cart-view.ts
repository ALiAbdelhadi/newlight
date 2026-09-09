import {
    multiplyMoney,
    resolveEffectivePrice,
    serializeMoney,
    subtractMoney,
    sumMoney,
    type ActiveDiscount,
    type SerializedMoney,
} from "@repo/database"

import type { CartItem } from "@/types"
import type { CartService } from "./cart-service"

type CartRow = NonNullable<Awaited<ReturnType<typeof CartService.getCartWithItems>>>["items"][number]

/**
 * One cart item, as every cart surface reads it.
 *
 * This lived inside `/api/cart/route.ts`, where GET and PATCH shared it. It moves here because a
 * third reader arrived — the `/cart` page renders the same rows on the server, straight from
 * `CartService`, without a round trip through its own API — and a view-model with two copies is
 * how a field ends up on the page and missing from the drawer.
 *
 * `price` is the DISCOUNTED unit price, because that is what the checkout will charge;
 * `basePrice` is the struck-through number (§13.2). Money crosses as a string: a Decimal does
 * not survive the boundary (ADR 0001).
 */
export function formatCartItem(item: CartRow, discounts: readonly ActiveDiscount[]): CartItem {
    const productTranslation = item.product.translations[0]
    const subCategoryTranslation = item.product.subCategory.translations[0]
    const categoryTranslation = item.product.subCategory.category.translations[0]
    const priced = resolveEffectivePrice(item.product.price, item.product, discounts)

    return {
        id: item.id,
        productId: item.product.productId,
        productName: productTranslation?.name || item.product.productId,
        // ProductImage rows, primary first — `images[]` on the product is gone (§5).
        productImages: item.product.images.map((image) => image.url),
        price: priced.effective,
        basePrice: priced.base,
        discountPercent: priced.percentOff,
        quantity: item.quantity,
        subCategory: subCategoryTranslation?.name || "N/A",
        // categoryType is gone with the enum (§3); the category's own slug identifies it,
        // per-locale, which is also what a link needs.
        categorySlug: categoryTranslation?.slug ?? "",
        category: categoryTranslation?.name || "N/A",
        selectedColorTemp: item.selectedColorTemp,
        selectedColorKey: item.selectedColorKey,
        colorTemperatures: item.product.colorTemperatures || [],
        availableColors: item.product.availableColors.map((link) => link.color.key),
        totalPrice: serializeMoney(multiplyMoney(priced.effective, item.quantity)),
    }
}

export interface CartTotals {
    /** Sum of undiscounted line totals. */
    subtotal: SerializedMoney
    /** How much the running discounts take off `subtotal`. Zero when nothing is on offer. */
    discount: SerializedMoney
    /** What the customer would pay for the goods. Shipping is decided per order, not here. */
    total: SerializedMoney
    /** Units, not lines — three of one lamp is three. */
    units: number
}

/**
 * Totals over already-formatted rows, through the money helpers and never `Number()`.
 *
 * Computed from the serialised rows rather than re-read from the database so the figures at
 * the bottom of the page describe exactly the rows above them.
 */
export function cartTotals(items: readonly CartItem[]): CartTotals {
    const subtotal = sumMoney(items.map((item) => multiplyMoney(item.basePrice, item.quantity)))
    const total = sumMoney(items.map((item) => item.totalPrice))

    return {
        subtotal: serializeMoney(subtotal),
        discount: serializeMoney(subtractMoney(subtotal, total)),
        total: serializeMoney(total),
        units: items.reduce((count, item) => count + item.quantity, 0),
    }
}
