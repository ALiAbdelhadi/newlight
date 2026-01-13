import { OrderStatus, prisma } from "@repo/database"

interface CancelOrderResult {
    success: boolean
    message?: string
    error?: string
}

export class OrderService {
    /**
     * Cancel an order and restore inventory
     */
    static async cancelOrder(
        orderId: string,
        userId: string | null
    ): Promise<CancelOrderResult> {
        try {
            // 1. Find the order with its items
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            })

            if (!order) {
                throw new Error("Order not found")
            }

            // 2. Check if order can be cancelled
            const cannotCancelStatuses: OrderStatus[] = [
                "cancelled",
                "shipped",
                "delivered",
                "fulfilled",
            ]

            if (cannotCancelStatuses.includes(order.status)) {
                throw new Error("Order cannot be cancelled")
            }

            // 3. If userId is provided (customer cancellation), verify ownership
            if (userId && order.userId !== userId) {
                throw new Error("Unauthorized")
            }

            // 4. Restore inventory for each product
            const inventoryUpdates = order.items.map((item) =>
                prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        inventory: {
                            increment: item.quantity,
                        },
                    },
                })
            )

            // 5. Update order status
            const orderUpdate = prisma.order.update({
                where: { id: orderId },
                data: {
                    status: "cancelled",
                    updatedAt: new Date(),
                },
            })

            // 6. Execute all updates in a transaction
            await prisma.$transaction([...inventoryUpdates, orderUpdate])

            return {
                success: true,
                message: "Order cancelled successfully",
            }
        } catch (error) {
            console.error("OrderService.cancelOrder error:", error)

            if (error instanceof Error) {
                return {
                    success: false,
                    error: error.message,
                }
            }

            return {
                success: false,
                error: "Failed to cancel order",
            }
        }
    }

    /**
     * Update order status
     */
    static async updateOrderStatus(
        orderId: string,
        status: OrderStatus
    ): Promise<{ success: boolean; error?: string }> {
        try {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status,
                    updatedAt: new Date(),
                    // Automatically set timestamps for certain statuses
                    ...(status === "shipped" && { shippedAt: new Date() }),
                    ...(status === "delivered" && { deliveredAt: new Date() }),
                },
            })

            return { success: true }
        } catch (error) {
            console.error("OrderService.updateOrderStatus error:", error)
            return {
                success: false,
                error: "Failed to update order status",
            }
        }
    }

    /**
     * Get order by ID with all relations
     */
    static async getOrderById(orderId: string) {
        try {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phoneNumber: true,
                            preferredLanguage: true,
                            preferredCurrency: true,
                        },
                    },
                    shippingAddress: true,
                    items: {
                        include: {
                            product: {
                                include: {
                                    translations: true,
                                },
                            },
                            configuration: true,
                        },
                    },
                    configuration: true,
                },
            })

            return order
        } catch (error) {
            console.error("OrderService.getOrderById error:", error)
            return null
        }
    }
}