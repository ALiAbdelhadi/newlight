import { prisma } from "@repo/database"
import { NextResponse } from "next/server"


export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params


        const order = await prisma.order.findUnique({
            where: { id: orderId },
        })

        if (!order) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            )
        }

        if (order.status === "cancelled") {
            return NextResponse.json(
                { error: "Order is already cancelled" },
                { status: 400 }
            )
        }

        if (order.status === "shipped" || order.status === "delivered" || order.status === "fulfilled") {
            return NextResponse.json(
                { error: "Cannot cancel an order that has been shipped or delivered" },
                { status: 400 }
            )
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "cancelled",
                adminNotes: `Order cancelled on ${new Date().toISOString()}`
            },
        })

        return NextResponse.json({
            success: true,
            order: updatedOrder,
        })
    } catch (error) {
        console.error("Error cancelling order:", error)
        return NextResponse.json(
            { error: "Failed to cancel order" },
            { status: 500 }
        )
    }
}