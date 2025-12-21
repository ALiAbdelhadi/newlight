import { prisma, OrderStatus } from "@repo/database"

export interface OrderWithItems {
    id: string
    orderNumber: string
    userId: string
    user: {
        id: string
        email: string | null
        phoneNumber: string | null
    }
    subtotal: number
    shippingCost: number
    tax: number | null
    total: number
    status: OrderStatus
    createdAt: Date
    items: Array<{
        id: string
        productName: string
        productImage: string
        price: number
        quantity: number
        selectedColorTemp: string | null
        selectedColor: string | null
    }>
    shippingAddress: {
        fullName: string
        email: string | null
        phone: string
    } | null
}

export async function getAllOrders(): Promise<OrderWithItems[]> {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            items: {
                select: {
                    id: true,
                    productName: true,
                    productImage: true,
                    price: true,
                    quantity: true,
                    selectedColorTemp: true,
                    selectedColor: true,
                },
            },
            shippingAddress: {
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
        },
    })

    return orders as OrderWithItems[]
}

export async function getOrdersByStatus(status: OrderStatus): Promise<OrderWithItems[]> {
    const orders = await prisma.order.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            items: {
                select: {
                    id: true,
                    productName: true,
                    productImage: true,
                    price: true,
                    quantity: true,
                    selectedColorTemp: true,
                    selectedColor: true,
                },
            },
            shippingAddress: {
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
        },
    })

    return orders as OrderWithItems[]
}

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            items: {
                select: {
                    id: true,
                    productName: true,
                    productImage: true,
                    price: true,
                    quantity: true,
                    selectedColorTemp: true,
                    selectedColor: true,
                },
            },
            shippingAddress: {
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                },
            },
        },
    })

    return order as OrderWithItems | null
}

