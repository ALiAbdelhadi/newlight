"use server"

import { OrderStatus, prisma } from "@repo/database"
import { unstable_cache } from "next/cache"


export const getDashboardStats = unstable_cache(
    async () => {
        try {
            // Parallel queries for maximum performance
            const [
                pendingOrdersCount,
                awaitingShipmentCount,
                unreadNotificationsCount,
                pendingReviewsCount,
                totalProducts,
                totalCustomers,
            ] = await Promise.all([
                // Orders with "processing" status
                prisma.order.count({
                    where: {
                        status: OrderStatus.processing,
                    },
                }),

                // Orders awaiting shipment
                prisma.order.count({
                    where: {
                        status: OrderStatus.awaiting_shipment,
                    },
                }),

                // Simulated notifications (add your notification model if exists)
                // For now, using recent orders as "notifications"
                prisma.order.count(),

                // Products with low inventory (< 10 items) as "reviews needed"
                // Replace with actual review model when you have one
                prisma.product.count({
                    where: {
                        inventory: {
                            lt: 10,
                        },
                        isActive: true,
                    },
                }),

                // Total active products
                prisma.product.count({
                    where: {
                        isActive: true,
                    },
                }),

                // Total customers (users)
                prisma.user.count(),
            ])

            return {
                orders: pendingOrdersCount + awaitingShipmentCount,
                shipping: awaitingShipmentCount,
                notifications: unreadNotificationsCount,
                reviews: pendingReviewsCount,
                products: totalProducts,
                customers: totalCustomers,
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error)
            return {
                orders: 0,
                shipping: 0,
                notifications: 0,
                reviews: 0,
                products: 0,
                customers: 0,
            }
        }
    },
    ["dashboard-stats"],
    {
        revalidate: 60, // Cache for 60 seconds
        tags: ["dashboard-stats"],
    }
)

/**
 * Get detailed order statistics
 */
export const getOrderStats = async () => {
    try {
        const stats = await prisma.order.groupBy({
            by: ["status"],
            _count: {
                id: true,
            },
        })

        return stats.reduce(
            (acc, stat) => {
                acc[stat.status] = stat._count.id
                return acc
            },
            {} as Record<OrderStatus, number>
        )
    } catch (error) {
        console.error("Error fetching order stats:", error)
        return {} as Record<OrderStatus, number>
    }
}

/**
 * Get low stock products count
 */
export const getLowStockCount = async (threshold: number = 10) => {
    try {
        return await prisma.product.count({
            where: {
                inventory: {
                    lt: threshold,
                },
                isActive: true,
            },
        })
    } catch (error) {
        console.error("Error fetching low stock count:", error)
        return 0
    }
}