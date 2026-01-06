import { prisma, ShippingAddress, User } from "@repo/database"

export interface UserWithAddress extends User {
    shippingAddress: ShippingAddress | null
}

export class UserService {
    /**
     * Get or create user
     */
    static async getOrCreateUser(userId: string): Promise<User> {
        let user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            user = await prisma.user.create({
                data: { id: userId },
            })
        }

        return user
    }

    /**
     * Get user with shipping address
     */
    static async getUserWithAddress(userId: string): Promise<UserWithAddress | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                shippingAddress: true,
            },
        })

        return user
    }

    /**
     * Get user's shipping address
     */
    static async getShippingAddress(userId: string): Promise<ShippingAddress | null> {
        const address = await prisma.shippingAddress.findUnique({
            where: { userId },
        })

        return address
    }

    /**
     * Create or update shipping address
     */
    static async saveShippingAddress(
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
    ): Promise<{ success: boolean; address: ShippingAddress }> {
        // Ensure user exists
        await this.getOrCreateUser(userId)

        const existingAddress = await prisma.shippingAddress.findUnique({
            where: { userId },
        })

        let address: ShippingAddress

        if (existingAddress) {
            // Update existing address
            address = await prisma.shippingAddress.update({
                where: { userId },
                data: {
                    ...data,
                    country: data.country || "Egypt",
                },
            })
        } else {
            // Create new address
            address = await prisma.shippingAddress.create({
                data: {
                    userId,
                    ...data,
                    country: data.country || "Egypt",
                    isDefault: true,
                },
            })
        }

        return { success: true, address }
    }

    /**
     * Delete shipping address
     */
    static async deleteShippingAddress(userId: string): Promise<{ success: boolean }> {
        const address = await prisma.shippingAddress.findUnique({
            where: { userId },
        })

        if (!address) {
            return { success: true }
        }

        await prisma.shippingAddress.delete({
            where: { userId },
        })

        return { success: true }
    }

    /**
     * Check if user has shipping address
     */
    static async hasShippingAddress(userId: string): Promise<boolean> {
        const address = await prisma.shippingAddress.findUnique({
            where: { userId },
            select: { id: true },
        })

        return !!address
    }

    /**
     * Get user's order history
     */
    static async getOrderHistory(
        userId: string,
        options?: {
            skip?: number
            take?: number
        }
    ) {
        const { skip = 0, take = 10 } = options || {}

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    translations: { take: 1 },
                                },
                            },
                        },
                    },
                    shippingAddress: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.order.count({
                where: { userId },
            }),
        ])

        return {
            orders,
            pagination: {
                total,
                skip,
                take,
                hasMore: skip + take < total,
            },
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(userId: string) {
        const [orderCount, totalSpent, orders] = await Promise.all([
            prisma.order.count({
                where: { userId },
            }),
            prisma.order.aggregate({
                where: { userId },
                _sum: { total: true },
            }),
            prisma.order.findMany({
                where: { userId },
                select: { status: true },
            }),
        ])

        const statusCounts = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        return {
            orderCount,
            totalSpent: totalSpent._sum.total || 0,
            statusCounts,
        }
    }
}