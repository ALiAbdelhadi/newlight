/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prisma, prisma } from "@repo/database"

type CreateOrderResult =
    | {
        success: true
        orderId: string
        orderNumber: string
        isDuplicate: boolean
    }
    | {
        success: false
        error: string
    }

type CancelOrderResult =
    | {
        success: true
        order?: any
    }
    | {
        success: false
        error: string
    }

export class OrderService {
    /**
     * Create order with full transactional safety
     */
    static async createOrder(params: {
        userId: string
        configurationId: string
        shippingAddressId: string
        shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping"
        idempotencyKey: string
    }): Promise<CreateOrderResult> {
        const { userId, configurationId, shippingAddressId, shippingOption, idempotencyKey } =
            params

        try {
            // Idempotency check
            const existingOrder = await this.findOrderByIdempotencyKey(userId, idempotencyKey)
            if (existingOrder) {
                return {
                    success: true,
                    orderId: existingOrder.id,
                    orderNumber: existingOrder.orderNumber,
                    isDuplicate: true,
                }
            }

            // Transactional creation
            const result = await prisma.$transaction(
                async (tx) => {
                    const config = await tx.configuration.findUnique({
                        where: { id: configurationId },
                    })

                    if (!config) {
                        throw new Error("Configuration not found")
                    }

                    const product = await tx.product.findUnique({
                        where: { productId: config.productId },
                        include: { translations: { take: 1 } },
                    })

                    if (!product) {
                        throw new Error("Product not found")
                    }

                    if (product.inventory < config.quantity) {
                        throw new Error("Insufficient inventory")
                    }

                    const shippingCosts = {
                        BasicShipping: 50,
                        StandardShipping: 100,
                        ExpressShipping: 200,
                    }
                    const shippingCost = shippingCosts[shippingOption]
                    const subtotal = config.totalPrice
                    const total = subtotal + shippingCost

                    const orderNumber = await this.generateOrderNumber(tx)

                    const order = await tx.order.create({
                        data: {
                            userId,
                            orderNumber,
                            subtotal,
                            shippingCost,
                            total,
                            status: "awaiting_shipment",
                            shippingOption,
                            shippingAddressId,
                            configurationId,
                            customerNotes: `idempotency:${idempotencyKey}`,
                            items: {
                                create: {
                                    productId: product.id,
                                    productName: product.translations[0]?.name || product.productId,
                                    productImage: product.images[0] || "",
                                    price: product.price,
                                    quantity: config.quantity,
                                    selectedColorTemp: config.selectedColorTemp as any,
                                    selectedColor: config.selectedColor,
                                    configurationId,
                                },
                            },
                        },
                    })

                    await tx.product.update({
                        where: { id: product.id },
                        data: { inventory: { decrement: config.quantity } },
                    })

                    return {
                        success: true as const,
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        isDuplicate: false,
                    }
                },
                {
                    maxWait: 5000,
                    timeout: 10000,
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                }
            )

            return result
        } catch (error) {
            console.error("Order creation error:", error)

            // Return structured error
            if (error instanceof Error) {
                return {
                    success: false,
                    error: error.message,
                }
            }

            return {
                success: false,
                error: "Failed to create order",
            }
        }
    }

    private static async findOrderByIdempotencyKey(userId: string, idempotencyKey: string) {
        return await prisma.order.findFirst({
            where: {
                userId,
                customerNotes: { contains: `idempotency:${idempotencyKey}` },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            select: { id: true, orderNumber: true },
        })
    }

    private static async generateOrderNumber(
        tx: Prisma.TransactionClient,
        maxRetries = 3
    ): Promise<string> {
        for (let i = 0; i < maxRetries; i++) {
            const orderNumber = `ORD-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)
                .toUpperCase()}`

            const exists = await tx.order.findUnique({
                where: { orderNumber },
                select: { id: true },
            })

            if (!exists) return orderNumber
        }

        throw new Error("Failed to generate unique order number")
    }

    /**
     * Cancel order + restore inventory
     */
    static async cancelOrder(orderId: string, userId: string | null): Promise<CancelOrderResult> {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Find order (with or without userId check for admin)
                const where = userId ? { id: orderId, userId } : { id: orderId }

                const order = await tx.order.findFirst({
                    where,
                    include: { items: true },
                })

                if (!order) {
                    throw new Error("Order not found")
                }

                if (!["awaiting_shipment", "processing"].includes(order.status)) {
                    throw new Error("Order cannot be cancelled")
                }

                // Restore inventory
                for (const item of order.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { inventory: { increment: item.quantity } },
                    })
                }

                const updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: { status: "cancelled" },
                })

                return {
                    success: true as const,
                    order: updatedOrder
                }
            })

            return result
        } catch (error) {
            console.error("Order cancellation error:", error)

            // Return structured error
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
}