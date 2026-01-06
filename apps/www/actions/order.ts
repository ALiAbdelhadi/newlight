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

const idempotencyCache = new Map<string, {
    result: any
    timestamp: number
    expiresAt: number
}>()

const CACHE_TTL = 5 * 60 * 1000
const MAX_CACHE_SIZE = 10000

const rateLimitMap = new Map<string, {
    count: number
    resetAt: number
}>()

function checkRateLimit(userId: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now()
    const userLimit = rateLimitMap.get(userId)

    if (!userLimit || now > userLimit.resetAt) {
        rateLimitMap.set(userId, {
            count: 1,
            resetAt: now + windowMs
        })
        return true
    }

    if (userLimit.count >= maxRequests) {
        return false
    }

    userLimit.count++
    return true
}

function cleanCache() {
    const now = Date.now()

    for (const [key, value] of idempotencyCache.entries()) {
        if (now > value.expiresAt) {
            idempotencyCache.delete(key)
        }
    }

    if (idempotencyCache.size > MAX_CACHE_SIZE) {
        const sortedEntries = Array.from(idempotencyCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)

        const removeCount = Math.floor(MAX_CACHE_SIZE * 0.2)
        for (let i = 0; i < removeCount; i++) {
            idempotencyCache.delete(sortedEntries[i][0])
        }
    }

    for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetAt) {
            rateLimitMap.delete(key)
        }
    }
}

setInterval(cleanCache, 60000)

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

        if (!checkRateLimit(userId, 5, 60000)) {
            return {
                success: false,
                error: "Too many requests. Please try again in a minute.",
                rateLimited: true
            }
        }

        let idempotencyKey: string

        if (clientIdempotencyKey) {
            if (!isValidIdempotencyKey(clientIdempotencyKey)) {
                return {
                    success: false,
                    error: "Invalid idempotency key format"
                }
            }
            idempotencyKey = clientIdempotencyKey
        } else {
            idempotencyKey = generateIdempotencyKey(userId, configId)
        }

        const cached = idempotencyCache.get(idempotencyKey)
        if (cached && Date.now() < cached.expiresAt) {
            return {
                ...cached.result,
                fromCache: true,
                isDuplicate: true
            }
        }

        const existingOrder = await prisma.order.findUnique({
            where: { idempotencyKey },
            include: {
                items: true,
                shippingAddress: true
            }
        })

        if (existingOrder) {
            const result = {
                success: true,
                order: { id: existingOrder.id },
                orderNumber: existingOrder.orderNumber,
                isDuplicate: true,
                existingOrderId: existingOrder.id
            }

            idempotencyCache.set(idempotencyKey, {
                result,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_TTL
            })

            return result
        }

        const shippingAddress = await UserService.getShippingAddress(userId)

        if (!shippingAddress) {
            return {
                success: false,
                error: "Shipping address required",
                needsShippingAddress: true,
            }
        }

        const configuration = await prisma.configuration.findFirst({
            where: {
                id: configId,
                users: {
                    some: {
                        id: userId
                    }
                }
            }
        })

        if (!configuration) {
            return {
                success: false,
                error: "Configuration not found or access denied"
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
            const successResult = {
                success: true,
                order: { id: result.orderId },
                orderNumber: result.orderNumber,
                isDuplicate: false,
            }

            idempotencyCache.set(idempotencyKey, {
                result: successResult,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_TTL
            })

            revalidatePath("/orders")
            revalidatePath(`/orders/${result.orderId}`)

            return successResult
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

        if (!checkRateLimit(`cancel-${userId}`, 10, 60000)) {
            return {
                success: false,
                error: "Too many cancellation requests",
                rateLimited: true
            }
        }

        const result = await OrderService.cancelOrder(orderId, userId)

        if (result.success) {
            try {
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { idempotencyKey: true }
                })

                if (order?.idempotencyKey) {
                    idempotencyCache.delete(order.idempotencyKey)
                }
            } catch (err) {
                console.error("Error clearing cache:", err)
            }

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

        if (order.idempotencyKey) {
            idempotencyCache.delete(order.idempotencyKey)
        }

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

        idempotencyCache.delete(key)

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
            idempotencyCacheSize: idempotencyCache.size,
            rateLimitMapSize: rateLimitMap.size
        }
    } catch (error) {
        console.error("Error getting cache stats:", error)
        return null
    }
}