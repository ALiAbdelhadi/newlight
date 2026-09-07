import { addMoney, divideMoney, multiplyMoney, serializeMoney } from "@repo/database"
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
                // Money stays Decimal until it is serialised, and shipping is apportioned
                // across the lines rather than divided in floating point (ADR 0001).
                shippingPrice: serializeMoney(divideMoney(order.shippingCost, order.items.length)),
                discountRate: 0,
                totalPrice: serializeMoney(
                    addMoney(multiplyMoney(item.price, item.quantity), divideMoney(order.shippingCost, order.items.length))
                ),
                status: order.status,
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