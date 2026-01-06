import { NextResponse } from "next/server"
import { OrderService } from "@/lib/services/order-service"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params

        if (!orderId) {
            return NextResponse.json(
                { error: "Order ID is required" },
                { status: 400 }
            )
        }

        console.log(`[API] Attempting to cancel order: ${orderId}`)

        // TODO: Add authentication check
        // const { userId } = await auth()
        // const isAdmin = await checkAdminPermission(userId)
        // For now, passing null as userId (admin cancellation)

        // Cancel the order
        const result = await OrderService.cancelOrder(orderId, null)

        if (!result.success) {
            console.error(`[API] Failed to cancel order: ${result.error}`)

            // Return specific error messages
            if (result.error === "Order not found") {
                return NextResponse.json(
                    { error: "Order not found" },
                    { status: 404 }
                )
            }

            if (result.error === "Order cannot be cancelled") {
                return NextResponse.json(
                    {
                        error: "This order cannot be cancelled. It may have already been shipped or delivered.",
                        details: result.error
                    },
                    { status: 400 }
                )
            }

            if (result.error === "Unauthorized") {
                return NextResponse.json(
                    { error: "Unauthorized to cancel this order" },
                    { status: 403 }
                )
            }

            // Generic error
            return NextResponse.json(
                { error: result.error || "Failed to cancel order" },
                { status: 400 }
            )
        }

        console.log(`[API] Order cancelled successfully: ${orderId}`)

        return NextResponse.json({
            success: true,
            message: result.message || "Order cancelled successfully",
        }, { status: 200 })

    } catch (error) {
        console.error("[API] Error cancelling order:", error)

        // Handle unexpected errors
        return NextResponse.json(
            {
                error: "An unexpected error occurred while cancelling the order",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}