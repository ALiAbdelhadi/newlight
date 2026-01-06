import { auth } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"

/**
 * Update order status
 * Typically called by admin or payment webhook
 */
export async function updateOrderStatus(
    orderId: string,
    status: "awaiting_shipment" | "processing" | "shipped" | "delivered" | "fulfilled" | "cancelled" | "refunded",
    trackingNumber?: string
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required"
            }
        }

        // Verify order ownership
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            },
            select: { id: true, status: true }
        })

        if (!order) {
            return {
                success: false,
                error: "Order not found"
            }
        }

        // Update order
        const updateData: any = { status }

        if (status === "shipped" && trackingNumber) {
            updateData.trackingNumber = trackingNumber
            updateData.shippedAt = new Date()
        }

        if (status === "delivered") {
            updateData.deliveredAt = new Date()
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
        })

        revalidatePath("/orders")
        revalidatePath(`/orders/${orderId}`)

        return {
            success: true,
            order: updatedOrder
        }

    } catch (error) {
        console.error("Error updating order status:", error)
        return {
            success: false,
            error: "Failed to update order status"
        }
    }
}