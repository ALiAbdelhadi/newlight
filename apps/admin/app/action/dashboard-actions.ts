"use server"

import { OrderStatus, prisma , countLowStock } from "@repo/database"
import { unstable_cache } from "next/cache"
import type { DashboardStats } from "@/types"

export const getDashboardStats = unstable_cache(
    async (): Promise<DashboardStats> => {
        try {
            const [
                pendingOrdersCount,
                awaitingShipmentCount,
                unreadNotificationsCount,
                pendingReviewsCount,
                totalProducts,
                totalCustomers,
                unreadContactForms,
                untranslated,
            ] = await Promise.all([
                prisma.order.count({
                    where: { status: OrderStatus.shipped },
                }),

                prisma.order.count({
                    where: {
                        status: OrderStatus.awaiting_shipment,
                    },
                }),

                prisma.order.count(),

                countLowStock(prisma, 10),

                prisma.product.count({
                    where: {
                        isActive: true,
                    },
                }),

                prisma.user.count({ where: { role: "CUSTOMER" } }),

                prisma.contactForm.count({
                    where: { isRead: false },
                }),

                prisma.product.count({
                    where: { deletedAt: null, translations: { none: { locale: "ar" } } },
                }),
            ])

            return {
                orders: pendingOrdersCount + awaitingShipmentCount,
                shipping: awaitingShipmentCount,
                notifications: unreadNotificationsCount,
                reviews: pendingReviewsCount,
                products: totalProducts,
                customers: totalCustomers,
                contacts: unreadContactForms,
                untranslated,
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
                contacts: 0,
                untranslated: 0,
            }
        }
    },
    ["dashboard-stats"],
    {
        revalidate: 60,
        tags: ["dashboard-stats"],
    }
)

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

export const getLowStockCount = async (threshold: number = 10) => {
    try {
        return await countLowStock(prisma, threshold)
    } catch (error) {
        console.error("Error fetching low stock count:", error)
        return 0
    }
}