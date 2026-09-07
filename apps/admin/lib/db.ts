import { prisma, type OrderStatus, type Prisma } from "@repo/database"

/**
 * Order reads for the admin panel.
 *
 * The hand-written `OrderWithItems` interface is gone, and with it two `as OrderWithItems`
 * casts. It declared money as `number` — so every consumer got a Decimal at runtime and a
 * number in the type system — and it declared a `user.email` that the query did not select
 * while the query selected a `user.phone` that does not exist on the model.
 *
 * The payload is derived from the query now, so the shape and the type cannot disagree.
 */

const orderInclude = {
    user: { select: { id: true, name: true, email: true, phoneNumber: true } },
    items: true,
    shippingAddress: true,
} satisfies Prisma.OrderInclude

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

export async function getAllOrders(): Promise<OrderWithItems[]> {
    return prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: orderInclude })
}

export async function getOrdersByStatus(status: OrderStatus): Promise<OrderWithItems[]> {
    return prisma.order.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        include: orderInclude,
    })
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
    return prisma.order.findUnique({ where: { id }, include: orderInclude })
}
