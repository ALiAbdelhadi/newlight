"use server"

import { CartService } from "@/lib/services/cart-service"
import { UserService } from "@/lib/services/user-service"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

/**
 * Add product to cart
 */
export async function addToCart(
  productId: string,
  quantity = 1,
  selectedColorTemp?: string,
  selectedColor?: string
) {
  try {
    // 1. Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // 2. Ensure user exists in database
    await UserService.getOrCreateUser(userId)

    // 3. Add to cart using CartService
    const result = await CartService.addToCart({
      userId,
      productId,
      quantity,
      selectedColorTemp,
      selectedColor,
    })

    // 4. Revalidate cart page
    revalidatePath("/cart")

    return {
      success: true,
      message: "Product added to cart",
      cartItem: result.cartItem,
    }

  } catch (error) {
    console.error("Failed to add item to cart:", error)

    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return {
          success: false,
          error: "Product not found",
        }
      }
    }

    return {
      success: false,
      error: "Failed to add product to cart",
    }
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(itemId: string, quantity: number) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const result = await CartService.updateItemQuantity({
      userId,
      itemId,
      quantity,
    })

    revalidatePath("/cart")

    return {
      success: true,
      message: "Cart updated",
      cartItem: result.cartItem,
    }

  } catch (error) {
    console.error("Failed to update cart item:", error)

    if (error instanceof Error) {
      if (error.message === "CART_ITEM_NOT_FOUND") {
        return {
          success: false,
          error: "Cart item not found",
        }
      }

      if (error.message === "INVALID_QUANTITY") {
        return {
          success: false,
          error: "Invalid quantity",
        }
      }
    }

    return {
      success: false,
      error: "Failed to update cart",
    }
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    await CartService.removeItem({
      userId,
      itemId,
    })

    revalidatePath("/cart")

    return {
      success: true,
      message: "Item removed from cart",
    }

  } catch (error) {
    console.error("Failed to remove item from cart:", error)

    if (error instanceof Error && error.message === "CART_ITEM_NOT_FOUND") {
      return {
        success: false,
        error: "Cart item not found",
      }
    }

    return {
      success: false,
      error: "Failed to remove item",
    }
  }
}

/**
 * Clear entire cart
 */
export async function clearCart() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    await CartService.clearCart(userId)

    revalidatePath("/cart")

    return {
      success: true,
      message: "Cart cleared",
    }

  } catch (error) {
    console.error("Failed to clear cart:", error)

    return {
      success: false,
      error: "Failed to clear cart",
    }
  }
}

/**
 * Get cart item count
 */
export async function getCartItemCount() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return 0
    }

    const count = await CartService.getCartItemCount(userId)
    return count

  } catch (error) {
    console.error("Failed to get cart count:", error)
    return 0
  }
}

/**
 * Get cart total
 */
export async function getCartTotal() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { subtotal: 0, discount: 0, total: 0 }
    }

    const totals = await CartService.calculateCartTotal(userId)
    return totals

  } catch (error) {
    console.error("Failed to get cart total:", error)
    return { subtotal: 0, discount: 0, total: 0 }
  }
}