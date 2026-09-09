
import {
    Cart,
    CartItem,
    type Locale,
    multiplyMoney,
    prisma,
    resolveEffectivePrice,
    ProductColorTemp,
    serializeMoney,
    subtractMoney,
    sumMoney,
    type SerializedMoney,
} from "@repo/database"
import { activeDiscounts } from "@/lib/discounts"

/**
 * Hand-written interfaces are gone: they declared `categoryType`, which the schema no longer
 * has, and the compiler could not tell the caller because every query ended in a cast. These
 * are DERIVED from the query, so the shape and the type cannot disagree.
 */
export type CartWithItems = NonNullable<Awaited<ReturnType<typeof CartService.getCartWithItems>>>
export type CartItemWithProduct = CartWithItems["items"][number]

export class CartService {
    /**
     * Get or create cart for user
     */
    static async getOrCreateCart(userId: string): Promise<Cart> {
        let cart = await prisma.cart.findUnique({
            where: { userId },
        })

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
            })
        }

        return cart
    }

    /**
     * Get cart with all items and product details
     */
    static async getCartWithItems(
        userId: string,
        locale: Locale = "ar"
    ) {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                translations: {
                                    where: { locale },
                                    take: 1,
                                },
                                // The cart renders a thumbnail and the colour swatches, so both
                                // come from their own tables now rather than from a TEXT[] and
                                // an enum array on the product row (§5, §8).
                                images: { orderBy: { order: "asc" as const }, take: 1 },
                                availableColors: { include: { color: true }, orderBy: { order: "asc" as const } },
                                subCategory: {
                                    include: {
                                        translations: {
                                            where: { locale },
                                            take: 1,
                                        },
                                        category: {
                                            include: {
                                                translations: {
                                                    where: { locale },
                                                    take: 1,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        return cart
    }

    /**
     * Add item to cart (or update quantity if exists)
     */
    static async addToCart(params: {
        userId: string
        productId: string
        quantity: number
        selectedColorTemp?: ProductColorTemp
        selectedColorKey?: string
    }): Promise<{ success: boolean; cartItem: CartItem }> {
        const { userId, productId, quantity, selectedColorTemp, selectedColorKey } = params

        return await prisma.$transaction(async (tx) => {
            // Get product
            const product = await tx.product.findUnique({
                where: { productId },
            })

            if (!product) {
                throw new Error("PRODUCT_NOT_FOUND")
            }

            // Get or create cart
            let cart = await tx.cart.findUnique({
                where: { userId },
            })

            if (!cart) {
                cart = await tx.cart.create({
                    data: { userId },
                })
            }

            // Check if item already exists
            const existingItem = await tx.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    productId: product.id,
                    selectedColorTemp: selectedColorTemp ?? null,
                    selectedColorKey: selectedColorKey || null,
                },
            })

            let cartItem: CartItem

            if (existingItem) {
                // Update quantity
                cartItem = await tx.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + quantity },
                })
            } else {
                // Create new item
                cartItem = await tx.cartItem.create({
                    data: {
                        cartId: cart.id,
                        productId: product.id,
                        quantity,
                        selectedColorTemp: selectedColorTemp ?? null,
                        selectedColorKey: selectedColorKey || null,
                    },
                })
            }

            return { success: true, cartItem }
        })
    }

    /**
     * Update cart item quantity
     */
    static async updateItemQuantity(params: {
        userId: string
        itemId: string
        quantity: number
    }): Promise<{ success: boolean; cartItem: CartItem }> {
        const { userId, itemId, quantity } = params

        if (quantity < 1) {
            throw new Error("INVALID_QUANTITY")
        }

        // Verify item belongs to user's cart
        const cartItem = await prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: { userId },
            },
        })

        if (!cartItem) {
            throw new Error("CART_ITEM_NOT_FOUND")
        }

        // Update quantity
        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        })

        return { success: true, cartItem: updatedItem }
    }

    /**
     * Remove item from cart
     */
    static async removeItem(params: {
        userId: string
        itemId: string
    }): Promise<{ success: boolean }> {
        const { userId, itemId } = params

        // Verify item belongs to user's cart
        const cartItem = await prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cart: { userId },
            },
        })

        if (!cartItem) {
            throw new Error("CART_ITEM_NOT_FOUND")
        }

        await prisma.cartItem.delete({
            where: { id: itemId },
        })

        return { success: true }
    }

    /**
     * Clear entire cart
     */
    static async clearCart(userId: string): Promise<{ success: boolean }> {
        const cart = await prisma.cart.findUnique({
            where: { userId },
        })

        if (!cart) {
            return { success: true }
        }

        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        })

        return { success: true }
    }

    /**
     * Get cart item count
     */
    static async getCartItemCount(userId: string): Promise<number> {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: true,
            },
        })

        if (!cart) {
            return 0
        }

        return cart.items.reduce((sum, item) => sum + item.quantity, 0)
    }

    /**
     * Calculate cart total
     */
    static async calculateCartTotal(userId: string): Promise<{
        subtotal: SerializedMoney
        discount: SerializedMoney
        total: SerializedMoney
    }> {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        })

        if (!cart) {
            return { subtotal: "0.00", discount: "0.00", total: "0.00" }
        }

        // `sum + item.product.price * item.quantity` multiplied a Decimal by a number in JS
        // and accumulated the result in a float — the arithmetic migration 0001 exists to
        // stop. Rounding happens once, at serialisation (ADR 0001).
        //
        // The unit price is the EFFECTIVE one (§13.2). `discount` is no longer the always-zero
        // column A21 deleted: it is what the live discounts actually take off this cart, and
        // subtotal + discount = total holds by construction rather than by hope.
        const discounts = await activeDiscounts()
        const priced = cart.items.map((item) => ({
            quantity: item.quantity,
            ...resolveEffectivePrice(item.product.price, item.product, discounts),
        }))

        const baseSubtotal = sumMoney(priced.map((line) => multiplyMoney(line.base, line.quantity)))
        const total = sumMoney(priced.map((line) => multiplyMoney(line.effective, line.quantity)))

        return {
            subtotal: serializeMoney(baseSubtotal),
            discount: serializeMoney(subtractMoney(baseSubtotal, total)),
            total: serializeMoney(total),
        }
    }
}