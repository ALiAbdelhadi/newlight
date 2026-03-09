/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import type { OrderWithDetails } from "@/types"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { OrderService } from "@/lib/services/order-service"
import { UserService } from "@/lib/services/user-service"
import { ProductService } from "@/lib/services/product-service"
import { generateIdempotencyKey, isValidIdempotencyKey } from "@/lib/idempotency"
import { prisma } from "@repo/database"


// Removed in-memory cache and rate limit maps to ensure compatibility with serverless environments.
// All idempotency checks now rely on the database 'idempotencyKey' unique constraint.

export async function getConfigurationDetails(configId: string) {
    try {
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: { users: true },
        })
        return configuration
    } catch (error) {
        console.error("Error getting configuration details:", error)
        return null
    }
}

export async function getProductWithDetails(productId: string, locale: string) {
    try {
        const product = await ProductService.getProduct(productId, locale)
        return product
    } catch (error) {
        console.error("Error getting product details:", error)
        return null
    }
}

export async function getUserShippingAddress(userId: string) {
    try {
        const address = await UserService.getShippingAddress(userId)
        return address
    } catch (error) {
        console.error("Error getting shipping address:", error)
        return null
    }
}

export async function saveShippingAddress(
    userId: string,
    data: {
        fullName: string
        phone: string
        email?: string
        addressLine1: string
        addressLine2?: string
        city: string
        state?: string
        postalCode: string
        country?: string
    }
) {
    try {
        const result = await UserService.saveShippingAddress(userId, data)

        if (result.success) {
            revalidatePath("/checkout")
        }

        return result
    } catch (error) {
        console.error("Error saving shipping address:", error)
        return { success: false, error: "Failed to save shipping address" }
    }
}

export async function createOrderFromConfiguration(
    configId: string,
    shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping" = "StandardShipping",
    clientIdempotencyKey?: string
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
                requiresAuth: true,
            }
        }

        const idempotencyKey = clientIdempotencyKey || generateIdempotencyKey(userId, configId)

        const existingOrder = await prisma.order.findUnique({
            where: { idempotencyKey },
            include: {
                items: true,
                shippingAddress: true
            }
        })

        if (existingOrder) {
            return {
                success: true,
                order: { id: existingOrder.id },
                orderNumber: existingOrder.orderNumber,
                isDuplicate: true,
                existingOrderId: existingOrder.id
            }
        }

        const shippingAddress = await UserService.getShippingAddress(userId)

        if (!shippingAddress) {
            return {
                success: false,
                error: "Shipping address required",
                needsShippingAddress: true,
            }
        }

        // First, check if configuration exists (regardless of user association)
        const configuration = await prisma.configuration.findUnique({
            where: { id: configId },
            include: { users: true }
        })

        if (!configuration) {
            return {
                success: false,
                error: "Configuration not found"
            }
        }

        // If configuration exists but is not associated with the user, associate it
        const isUserAssociated = configuration.users.some(user => user.id === userId)
        if (!isUserAssociated) {
            try {
                // Ensure user exists
                await UserService.getOrCreateUser(userId)
                
                // Associate configuration with user
                await prisma.configuration.update({
                    where: { id: configId },
                    data: {
                        users: {
                            connect: { id: userId }
                        }
                    }
                })
            } catch (error) {
                console.error("Error associating configuration with user:", error)
                // Continue anyway - the configuration exists and we can proceed
            }
        }

        const result = await OrderService.createOrder({
            userId,
            configurationId: configId,
            shippingAddressId: shippingAddress.id,
            shippingOption,
            idempotencyKey,
        })

        if (result.success) {
            revalidatePath("/orders")
            revalidatePath(`/orders/${result.orderId}`)

            return {
                success: true,
                order: { id: result.orderId },
                orderNumber: result.orderNumber,
                isDuplicate: result.isDuplicate,
            }
        }

        return {
            success: false,
            error: result.error || "Failed to create order",
        }

    } catch (error) {
        console.error("Order creation error:", error)

        if (error instanceof Error) {
            if (error.message.includes('Unique constraint') ||
                error.message.includes('unique_constraint') ||
                error.message.includes('idempotencyKey')) {

                try {
                    const { userId } = await auth()
                    if (userId) {
                        const idempotencyKey = generateIdempotencyKey(userId, configId)
                        const existingOrder = await prisma.order.findUnique({
                            where: { idempotencyKey }
                        })

                        if (existingOrder) {
                            return {
                                success: true,
                                order: { id: existingOrder.id },
                                orderNumber: existingOrder.orderNumber,
                                isDuplicate: true,
                                recoveredFromError: true
                            }
                        }
                    }
                } catch (fetchError) {
                    console.error("Error fetching existing order:", fetchError)
                }

                return {
                    success: false,
                    error: "Duplicate order detected. Please check your orders.",
                    isDuplicate: true
                }
            }

            if (error.message.includes("Insufficient inventory")) {
                return {
                    success: false,
                    error: "Product is out of stock",
                }
            }

            if (error.message.includes("Configuration not found")) {
                return {
                    success: false,
                    error: "Configuration not found",
                }
            }
        }

        return {
            success: false,
            error: "Failed to create order. Please try again.",
        }
    }
}

export async function getOrderDetails(orderId: string): Promise<OrderWithDetails | null> {
    try {
        const { userId } = await auth()

        if (!userId) {
            return null
        }

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
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
                shippingAddress: true,
                configuration: true,
            },
        })

        return order
    } catch (error) {
        console.error("Error getting order details:", error)
        return null
    }
}

export async function getUserOrders(page: number = 1, limit: number = 10) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
                orders: [],
            }
        }

        const { orders, pagination } = await UserService.getOrderHistory(userId, {
            skip: (page - 1) * limit,
            take: limit,
        })

        return {
            success: true,
            orders,
            pagination: {
                total: pagination.total,
                page,
                limit,
                totalPages: Math.ceil(pagination.total / limit),
            },
        }
    } catch (error) {
        console.error("Error getting user orders:", error)
        return {
            success: false,
            error: "Failed to fetch orders",
            orders: [],
        }
    }
}

export async function cancelOrder(orderId: string) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
                requiresAuth: true,
            }
        }

        const result = await OrderService.cancelOrder(orderId, userId)

        if (result.success) {

            revalidatePath("/orders")
            revalidatePath(`/orders/${orderId}`)
        }

        return result
    } catch (error) {
        console.error("Order cancellation error:", error)

        if (error instanceof Error) {
            if (error.message.includes("Order not found")) {
                return {
                    success: false,
                    error: "Order not found",
                }
            }

            if (error.message.includes("Order cannot be cancelled")) {
                return {
                    success: false,
                    error: "Order cannot be cancelled at this stage",
                }
            }
        }

        return {
            success: false,
            error: "Failed to cancel order",
        }
    }
}

export async function updateOrderStatus(
    orderId: string,
    status:
        | "awaiting_shipment"
        | "processing"
        | "shipped"
        | "delivered"
        | "fulfilled"
        | "cancelled"
        | "refunded",
    trackingNumber?: string
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
            }
        }

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            select: { id: true, status: true, idempotencyKey: true },
        })

        if (!order) {
            return {
                success: false,
                error: "Order not found",
            }
        }

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
            order: updatedOrder,
        }
    } catch (error) {
        console.error("Error updating order status:", error)
        return {
            success: false,
            error: "Failed to update order status",
        }
    }
}

export async function canCancelOrder(orderId: string): Promise<boolean> {
    try {
        const { userId } = await auth()

        if (!userId) return false

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            select: { status: true },
        })

        if (!order) return false

        return ["awaiting_shipment", "processing"].includes(order.status)
    } catch (error) {
        console.error("Error checking order cancellation:", error)
        return false
    }
}

export async function getUserOrderStats() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return null
        }

        const stats = await UserService.getUserStats(userId)
        return stats
    } catch (error) {
        console.error("Error getting order stats:", error)
        return null
    }
}

export async function clearIdempotencyCache(key: string) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return { success: false, error: "Unauthorized" }
        }

        // In-memory cache is removed, this function is now a no-op but kept for API compatibility.
        return { success: true }
    } catch (error) {
        console.error("Error clearing cache:", error)
        return { success: false, error: "Failed to clear cache" }
    }
}

export async function getCacheStats() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return null
        }

        return {
            idempotencyCacheSize: 0,
            rateLimitMapSize: 0
        }
    } catch (error) {
        console.error("Error getting cache stats:", error)
        return null
    }
}