import { resolveLocale } from "@repo/database"
import { activeDiscounts } from "@/lib/discounts"
import { CartService } from "@/lib/services/cart-service"
import { formatCartItem } from "@/lib/services/cart-view"
import type { CartItem } from "@/types"
import { removeCartItemSchema, updateCartItemSchema } from "@/lib/validation/schema"
import { currentUserId } from "@/lib/auth"
import { getLocale } from "next-intl/server"
import { NextResponse } from "next/server"

export async function GET() {
  const userId = await currentUserId()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cart = await CartService.getCartWithItems(userId, resolveLocale(locale))

    if (!cart) {
      return NextResponse.json([])
    }

    const discounts = await activeDiscounts()
    const cartItems: CartItem[] = cart.items.map((item) => formatCartItem(item, discounts))

    return NextResponse.json(cartItems)
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const validation = updateCartItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      )
    }

    const { itemId, quantity } = validation.data

    const result = await CartService.updateItemQuantity({
      userId,
      itemId,
      quantity,
    })

    const cart = await CartService.getCartWithItems(userId, resolveLocale(locale))
    const updatedItem = cart?.items.find((item) => item.id === itemId)

    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const formattedItem = formatCartItem(updatedItem, await activeDiscounts())

    return NextResponse.json(formattedItem)
  } catch (error) {
    console.error("Error updating cart item:", error)

    if (error instanceof Error) {
      if (error.message === "CART_ITEM_NOT_FOUND") {
        return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
      }
      if (error.message === "INVALID_QUANTITY") {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const userId = await currentUserId()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const validation = removeCartItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      )
    }

    const { itemId } = validation.data

    await CartService.removeItem({
      userId,
      itemId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cart item:", error)

    if (error instanceof Error && error.message === "CART_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 }
    )
  }
}