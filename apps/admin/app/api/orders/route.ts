import { NextResponse } from "next/server"
import { getAllOrders } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const orders = await getAllOrders()

        // Transform orders to match the expected format
        // Flatten orders with multiple items - each item becomes a row
        const flattenedOrders = orders.flatMap((order) => {
            const customerName = order.shippingAddress?.fullName ||
                order.user.email?.split("@")[0] ||
                "Unknown Customer"
            const customerEmail = order.shippingAddress?.email ||
                order.user.email ||
                "no-email@example.com"

            return order.items.map((item, index) => ({
                id: parseInt(order.orderNumber.replace(/\D/g, "") || "0") * 100 + index,
                orderNumber: order.orderNumber,
                customerName,
                customerEmail,
                customerAvatar: "", // We can add avatar logic later if needed
                productName: item.productName,
                productImage: item.productImage || "/placeholder-product.png",
                productPrice: item.price,
                quantity: item.quantity,
                shippingPrice: order.shippingCost / order.items.length, // Divide shipping cost among items
                discountRate: 0, // Can be calculated if we have discount data
                totalPrice: (item.price * item.quantity) + (order.shippingCost / order.items.length),
                status: (order.status === "fulfilled" || order.status === "delivered" || order.status === "shipped") ? "fulfilled" as const :
                    (order.status === "cancelled" || order.status === "refunded") ? "cancelled" as const :
                        order.status === "processing" ? "processing" as const :
                            "awaiting_shipment" as const,
                createdAt: order.createdAt.toISOString(),
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

