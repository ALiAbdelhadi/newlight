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

export function formatCartItem(item: CartRow, discounts: readonly ActiveDiscount[]): CartItem {
    const productTranslation = item.product.translations[0]
    const subCategoryTranslation = item.product.subCategory.translations[0]
    const categoryTranslation = item.product.subCategory.category.translations[0]
    const priced = resolveEffectivePrice(item.product.price, item.product, discounts)
    const categorySlug = categoryTranslation?.slug ?? ""
    const subCategorySlug = subCategoryTranslation?.slug ?? ""

    return {
        id: item.id,
        productId: item.product.productId,
        productName: productTranslation?.name || item.product.productId,
        productImages: item.product.images.map((image) => image.url),
        price: priced.effective,
        basePrice: priced.base,
        discountPercent: priced.percentOff,
        quantity: item.quantity,
        subCategory: subCategoryTranslation?.name || "N/A",
        categorySlug,
        subCategorySlug,
        productSlug: item.product.slug,
        href: `/category/${categorySlug}/${subCategorySlug}/${item.product.slug}`,
        category: categoryTranslation?.name || "N/A",
        selectedColorTemp: item.selectedColorTemp,
        selectedColorKey: item.selectedColorKey,
        colorTemperatures: item.product.colorTemperatures || [],
        availableColors: item.product.availableColors.map((link) => link.color.key),
        totalPrice: serializeMoney(multiplyMoney(priced.effective, item.quantity)),
    }
}

export interface CartTotals {
    subtotal: SerializedMoney
    discount: SerializedMoney
    total: SerializedMoney
    units: number
}

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
