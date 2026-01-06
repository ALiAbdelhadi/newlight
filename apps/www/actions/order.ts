/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import type { OrderWithDetails } from "@/types"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { OrderService } from "@/lib/services/order-service"
import { UserService } from "@/lib/services/user-service"
import { ProductService } from "@/lib/services/product-service"
import { prisma } from "@repo/database"

// ============================================
// Configuration & Product Queries (No Auth)
// ============================================

/**
 * Get configuration details (public access)
 */
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

/**
 * Get product with translations and category details (public access)
 */
export async function getProductWithDetails(productId: string, locale: string) {
    try {
        const product = await ProductService.getProduct(productId, locale)
        return product
    } catch (error) {
        console.error("Error getting product details:", error)
        return null
    }
}

// ============================================
// Shipping Address Management (Auth Required)
// ============================================

/**
 * Get user's shipping address
 */
export async function getUserShippingAddress(userId: string) {
    try {
        const address = await UserService.getShippingAddress(userId)
        return address
    } catch (error) {
        console.error("Error getting shipping address:", error)
        return null
    }
}

/**
 * Save or update user's shipping address
 */
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

// ============================================
// Order Creation (Using OrderService)
// ============================================

/**
 * Create order from configuration with full idempotency & transactional safety
 */
export async function createOrderFromConfiguration(
    configId: string,
    shippingOption: "BasicShipping" | "StandardShipping" | "ExpressShipping" = "StandardShipping",
    idempotencyKey?: string
) {
    try {
        // 1. Authenticate user
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
                requiresAuth: true,
            }
        }

        // 2. Validate shipping address exists
        const shippingAddress = await UserService.getShippingAddress(userId)

        if (!shippingAddress) {
            return {
                success: false,
                error: "Shipping address required",
                needsShippingAddress: true,
            }
        }

        // 3. Generate idempotency key (or use provided)
        const key = idempotencyKey || `${userId}-${configId}-${Date.now()}`

        // 4. Create order using OrderService
        const result = await OrderService.createOrder({
            userId,
            configurationId: configId,
            shippingAddressId: shippingAddress.id,
            shippingOption,
            idempotencyKey: key,
        })

        // 5. Handle result
        if (result.success) {
            // Revalidate paths
            revalidatePath("/orders")
            revalidatePath(`/orders/${result.orderId}`)

            return {
                success: true,
                order: { id: result.orderId },
                orderNumber: result.orderNumber,
                isDuplicate: result.isDuplicate || false,
            }
        }

        return {
            success: false,
            error: result.error || "Failed to create order",
        }
    } catch (error) {
        console.error("Order creation error:", error)

        // Handle specific error types
        if (error instanceof Error) {
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
            error: "Failed to create order",
        }
    }
}

// ============================================
// Order Retrieval (Auth Required)
// ============================================

/**
 * Get order details with full relations
 */
export async function getOrderDetails(orderId: string): Promise<OrderWithDetails | null> {
    try {
        const { userId } = await auth()

        if (!userId) {
            console.log("User not authenticated")
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

/**
 * Get all user orders (paginated)
 */
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

// ============================================
// Order Cancellation (Using OrderService)
// ============================================

/**
 * Cancel order and restore inventory
 */
export async function cancelOrder(orderId: string) {
    try {
        // 1. Authenticate user
        const { userId } = await auth()

        if (!userId) {
            return {
                success: false,
                error: "Authentication required",
                requiresAuth: true,
            }
        }

        // 2. Cancel order using OrderService
        const result = await OrderService.cancelOrder(orderId, userId)

        // 3. Revalidate orders page
        if (result.success) {
            revalidatePath("/orders")
            revalidatePath(`/orders/${orderId}`)
        }

        return result
    } catch (error) {
        console.error("Order cancellation error:", error)

        // Handle specific errors
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

// ============================================
// Order Status Updates (Admin/System)
// ============================================

/**
 * Update order status
 * Typically called by admin or payment webhook
 */
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

        // Verify order ownership
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            select: { id: true, status: true },
        })

        if (!order) {
            return {
                success: false,
                error: "Order not found",
            }
        }

        // Update order
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

// ============================================
// Order Validation Helpers
// ============================================

/**
 * Check if order can be cancelled by user
 */
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

/**
 * Get order statistics for user
 */
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