import { NextResponse } from "next/server"
import { getAllOrders } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const orders = await getAllOrders()

        const flattenedOrders = orders.flatMap((order) => {
            const customerName = order.shippingAddress?.fullName ||
                order.user.email?.split("@")[0] ||
                "Unknown Customer"
            const customerEmail = order.shippingAddress?.email ||
                order.user.email ||
                "no-email@example.com"

            return order.items.map((item, index) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                customerName,
                customerEmail,
                customerAvatar: "",
                productName: item.productName,
                productImage: item.productImage || "/placeholder-product.png",
                productPrice: item.price,
                quantity: item.quantity,
                shippingPrice: order.shippingCost / order.items.length,
                discountRate: 0,
                totalPrice: (item.price * item.quantity) + (order.shippingCost / order.items.length),
                status: (order.status === "fulfilled" || order.status === "delivered" || order.status === "shipped") ? "fulfilled" as const :
                    (order.status === "cancelled" || order.status === "refunded") ? "cancelled" as const :
                        order.status === "processing" ? "processing" as const :
                            "awaiting_shipment" as const,
                createdAt: order.createdAt.toISOString(),
                user: {
                    id: order.user.id,
                    email: order.user.email,
                    phoneNumber: order.user.phoneNumber,
                }
            }))
        })

        return NextResponse.json(flattenedOrders)
    } catch (error) {
        console.error("Error fetching orders:", error)
        return NextResponse.json(
            { error: "Failed to fetch orders" },
            { status: 500 }
        )
    }
}