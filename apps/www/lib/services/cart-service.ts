
import { Cart, CartItem, prisma, Product } from "@repo/database"

export interface CartItemWithProduct extends CartItem {
    product: Product & {
        translations: Array<{ name: string; locale: string }>
        subCategory: {
            translations: Array<{ name: string; locale: string }>
            category: {
                translations: Array<{ name: string; locale: string }>
                categoryType: string
            }
        }
    }
}

export interface CartWithItems extends Cart {
    items: CartItemWithProduct[]
}

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
        locale: string = "en"
    ): Promise<CartWithItems | null> {
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
        selectedColorTemp?: string
        selectedColor?: string
    }): Promise<{ success: boolean; cartItem: CartItem }> {
        const { userId, productId, quantity, selectedColorTemp, selectedColor } = params

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
                    selectedColorTemp: selectedColorTemp || null,
                    selectedColor: selectedColor || null,
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
                        selectedColorTemp: selectedColorTemp || null,
                        selectedColor: selectedColor || null,
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
        subtotal: number
        discount: number
        total: number
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
            return { subtotal: 0, discount: 0, total: 0 }
        }

        const subtotal = cart.items.reduce((sum, item) => {
            return sum + item.product.price * item.quantity
        }, 0)

        // Apply any discounts here
        const discount = 0

        return {
            subtotal,
            discount,
            total: subtotal - discount,
        }
    }
}