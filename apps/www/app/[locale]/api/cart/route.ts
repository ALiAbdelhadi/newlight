import { CartService } from "@/lib/services/cart-service"
import { removeCartItemSchema, updateCartItemSchema } from "@/lib/validation/scehma"
import { auth } from "@clerk/nextjs/server"
import { getLocale } from "next-intl/server"
import { NextResponse } from "next/server"

/**
 * GET - Fetch user's cart
 */
export async function GET() {
  const { userId } = await auth()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Use CartService instead of direct Prisma
    const cart = await CartService.getCartWithItems(userId, locale)

    if (!cart) {
      return NextResponse.json([])
    }

    // Format items for frontend
    const cartItems = cart.items.map((item) => {
      const productTranslation = item.product.translations[0]
      const subCategoryTranslation = item.product.subCategory.translations[0]
      const categoryTranslation = item.product.subCategory.category.translations[0]

      return {
        id: item.id,
        productId: item.product.productId,
        productName: productTranslation?.name || item.product.productId,
        productImages: item.product.images,
        price: item.product.price,
        quantity: item.quantity,
        discount: 0,
        subCategory: subCategoryTranslation?.name || "N/A",
        category: categoryTranslation?.name || "N/A",
        categoryType: item.product.subCategory.category.categoryType,
        selectedColorTemp: item.selectedColorTemp,
        selectedColor: item.selectedColor,
        colorTemperatures: item.product.colorTemperatures || [],
        availableColors: item.product.availableColors,
        totalPrice: item.product.price * item.quantity,
      }
    })

    return NextResponse.json(cartItems)
  } catch (error) {
    console.error("Error fetching cart:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

/**
 * PATCH - Update cart item quantity
 */
export async function PATCH(request: Request) {
  const { userId } = await auth()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = updateCartItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      )
    }

    const { itemId, quantity } = validation.data

    // Use CartService
    const result = await CartService.updateItemQuantity({
      userId,
      itemId,
      quantity,
    })

    // Get updated item with full details
    const cart = await CartService.getCartWithItems(userId, locale)
    const updatedItem = cart?.items.find((item) => item.id === itemId)

    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Format response
    const productTranslation = updatedItem.product.translations[0]
    const subCategoryTranslation = updatedItem.product.subCategory.translations[0]
    const categoryTranslation = updatedItem.product.subCategory.category.translations[0]

    const formattedItem = {
      id: updatedItem.id,
      productId: updatedItem.product.productId,
      productName: productTranslation?.name || updatedItem.product.productId,
      productImages: updatedItem.product.images,
      price: updatedItem.product.price,
      quantity: updatedItem.quantity,
      discount: 0,
      subCategory: subCategoryTranslation?.name || "N/A",
      category: categoryTranslation?.name || "N/A",
      categoryType: updatedItem.product.subCategory.category.categoryType,
      selectedColorTemp: updatedItem.selectedColorTemp,
      selectedColor: updatedItem.selectedColor,
      totalPrice: updatedItem.product.price * updatedItem.quantity,
    }

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

/**
 * DELETE - Remove item from cart
 */
export async function DELETE(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = removeCartItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      )
    }

    const { itemId } = validation.data

    // Use CartService
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