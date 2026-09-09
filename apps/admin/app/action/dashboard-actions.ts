"use server"

import { OrderStatus, prisma , countLowStock } from "@repo/database"
import { unstable_cache } from "next/cache"
import type { DashboardStats } from "@/types"


export const getDashboardStats = unstable_cache(
    async (): Promise<DashboardStats> => {
        try {
            // Parallel queries for maximum performance
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
                // `processing` was pruned in 0010: no production row held it and nothing
                // assigned it. Shipped orders are what "in flight" means now.
                prisma.order.count({
                    where: { status: OrderStatus.shipped },
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

                // Low stock, from the LEDGER's derived level (§13.4). The old query read
                // Product.inventory — a column 0011 dropped — and it asked about onHand
                // alone, so a product with 12 on hand and 11 reserved read as healthy.
                countLowStock(prisma, 10),

                // Total active products
                prisma.product.count({
                    where: {
                        isActive: true,
                    },
                }),

                // Customers, not users. The badge sits on a row labelled "Customers" and
                // linking to a surface that lists `role: CUSTOMER` only — counting the
                // administrators into it made the badge disagree with the page it points at.
                prisma.user.count({ where: { role: "CUSTOMER" } }),

                // Unread contact-form submissions (drives the sidebar badge)
                prisma.contactForm.count({
                    where: { isRead: false },
                }),

                // Products with no Arabic row at all. The cheap floor of the translation
                // queue — the queue itself also counts placeholder names and missing fields,
                // which is a scan rather than a count and does not belong in the sidebar.
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
        return await countLowStock(prisma, threshold)
    } catch (error) {
        console.error("Error fetching low stock count:", error)
        return 0
    }
}