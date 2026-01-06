import { logger } from "@/lib/logger"
import { OrderService } from "@/lib/services/order-service"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        logger.warn({ action: 'cancel_order' }, 'Unauthenticated attempt')
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
        )
    }

    try {
        const { orderId } = await params

        if (!orderId) {
            logger.warn({ action: 'cancel_order' }, 'Missing orderId')
            return NextResponse.json(
                { error: "Order ID is required" },
                { status: 400 }
            )
        }

        logger.info({ action: 'cancel_order' }, 'Cancellation initiated')

        const result = await OrderService.cancelOrder(orderId, userId)

        if (!result.success) {
            logger.warn({
                action: 'cancel_order',
                reason: result.error
            }, 'Cancellation failed')

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

            return NextResponse.json(
                { error: result.error || "Failed to cancel order" },
                { status: 400 }
            )
        }

        logger.info({ action: 'cancel_order' }, 'Order cancelled successfully')

        return NextResponse.json({
            success: true,
            message: result.message || "Order cancelled successfully",
        }, { status: 200 })

    } catch (error) {
        logger.error({
            action: 'cancel_order',
            err: error
        }, 'Unexpected error')

        return NextResponse.json(
            {
                error: "An unexpected error occurred while cancelling the order",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        )
    }
}