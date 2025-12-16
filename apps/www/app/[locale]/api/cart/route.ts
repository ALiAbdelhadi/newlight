import { auth } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { getLocale } from "next-intl/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { userId } = await auth()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                translations: {
                  where: { locale: locale },
                  take: 1,
                },
                subCategory: {
                  include: {
                    translations: {
                      where: { locale: locale },
                      take: 1,
                    },
                    category: {
                      include: {
                        translations: {
                          where: { locale: locale },
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

    if (!cart) {
      return NextResponse.json([])
    }

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
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  const locale = await getLocale()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { itemId, quantity } = await request.json()

    if (!itemId || quantity < 1) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            translations: {
              where: { locale: locale },
              take: 1,
            },
            subCategory: {
              include: {
                translations: {
                  where: { locale: locale },
                  take: 1,
                },
                category: {
                  include: {
                    translations: {
                      where: { locale: locale },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

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
    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID required" },
        { status: 400 }
      )
    }

    // Verify the item belongs to the user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      )
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cart item:", error)
    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 }
    )
  }
}