import { prisma, serializeMoney, translationsFor, type Locale, ShippingAddress, User } from "@repo/database"

export interface UserWithAddress extends User {
    shippingAddress: ShippingAddress | null
}

export class UserService {
    /**
     * Get or create user
     */
    /**
     * getOrCreateUser() is DELETED (§7). It upserted a User row from an id it had never seen,
     * which is how an order could end up attached to a user nobody registered. Better Auth
     * writes the row at sign-up; a caller that has an id has a row.
     */

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
    /**
     * A customer's order history.
     *
     * `locale` is required rather than optional. The include below read
     * `translations: { take: 1 }` with no `where` — §14.4's defect exactly — so PostgreSQL
     * returned whichever translation row it liked and an English customer could be shown the
     * Arabic product name. A signature that can be called without a locale is a signature that
     * will be.
     *
     * Money is serialised here too: `total`, `subtotal` and every line price are `Decimal`, and
     * this feeds a page that renders them (ADR 0001, A82).
     */
    static async getOrderHistory(
        userId: string,
        locale: Locale,
        options?: {
            skip?: number
            take?: number
        }
    ) {
        const { skip = 0, take = 10 } = options || {}

        const [rows, total] = await Promise.all([
            prisma.order.findMany({
                where: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    translations: translationsFor(locale),
                                    images: { orderBy: { order: "asc" }, take: 1 },
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

        const orders = rows.map((order) => ({
            ...order,
            subtotal: serializeMoney(order.subtotal),
            shippingCost: serializeMoney(order.shippingCost),
            tax: order.tax === null ? null : serializeMoney(order.tax),
            total: serializeMoney(order.total),
            items: order.items.map((item) => ({
                ...item,
                price: serializeMoney(item.price),
                product: {
                    productId: item.product.productId,
                    slug: item.product.slug,
                    name: item.product.translations[0]?.name ?? item.product.productId,
                    image: item.product.images[0]?.url ?? null,
                },
            })),
        }))

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