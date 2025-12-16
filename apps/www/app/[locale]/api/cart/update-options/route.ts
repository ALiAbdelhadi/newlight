import { auth } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
    const { userId } = await auth()

    if (!userId) {
        console.log("User Not authenticated");
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }


    try {
        const { itemId, selectedColorTemp, selectedColor } = await request.json()

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

        // Update only the fields that were provided
        const updateData: any = {}
        if (selectedColorTemp !== undefined) {
            updateData.selectedColorTemp = selectedColorTemp
        }
        if (selectedColor !== undefined) {
            updateData.selectedColor = selectedColor
        }

        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: updateData,
        })

        return NextResponse.json({ success: true, item: updatedItem })
    } catch (error) {
        console.error("Error updating cart item options:", error)
        return NextResponse.json(
            { error: "Failed to update cart item options" },
            { status: 500 }
        )
    }
}