"use server"

import { prisma } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"

export interface SearchHit {
    id: string
    label: string
    detail: string
    href: string
    keywords: string
}

export interface SearchResults {
    products: SearchHit[]
    orders: SearchHit[]
    customers: SearchHit[]
}

const EMPTY: SearchResults = { products: [], orders: [], customers: [] }

export async function searchAdmin(query: string): Promise<SearchResults> {
    await requireCurrentAdmin()

    const term = query.trim()
    if (term.length < 2) return EMPTY

    const [products, orders, customers] = await Promise.all([
        prisma.product.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { productId: { contains: term, mode: "insensitive" } },
                    { slug: { contains: term, mode: "insensitive" } },
                    { translations: { some: { name: { contains: term, mode: "insensitive" } } } },
                ],
            },
            take: 10,
            orderBy: { productId: "asc" },
            select: {
                id: true,
                productId: true,
                isActive: true,
                translations: { select: { locale: true, name: true } },
            },
        }),
        prisma.order.findMany({
            where: {
                OR: [
                    { orderNumber: { contains: term, mode: "insensitive" } },
                    { trackingNumber: { contains: term, mode: "insensitive" } },
                    { shippingAddress: { fullName: { contains: term, mode: "insensitive" } } },
                    { shippingAddress: { phone: { contains: term } } },
                ],
            },
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                user: { select: { email: true } },
                shippingAddress: { select: { fullName: true } },
            },
        }),
        prisma.user.findMany({
            where: {
                role: "CUSTOMER",
                OR: [
                    { name: { contains: term, mode: "insensitive" } },
                    { email: { contains: term, mode: "insensitive" } },
                    { phoneNumber: { contains: term } },
                    { shippingAddress: { fullName: { contains: term, mode: "insensitive" } } },
                ],
            },
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                shippingAddress: { select: { fullName: true } },
            },
        }),
    ])

    return {
        products: products.map((product) => {
            const en = product.translations.find((t) => t.locale === "en")?.name
            const ar = product.translations.find((t) => t.locale === "ar")?.name
            return {
                id: product.id,
                label: en || ar || product.productId,
                detail: product.isActive ? product.productId : `${product.productId} · hidden`,
                href: `/admin/products/${product.id}`,
                keywords: [product.productId, en, ar].filter(Boolean).join(" "),
            }
        }),
        orders: orders.map((order) => ({
            id: order.id,
            label: order.orderNumber,
            detail: order.shippingAddress?.fullName || order.user.email,
            href: `/admin/orders/${order.id}`,
            keywords: [order.orderNumber, order.status, order.user.email].join(" "),
        })),
        customers: customers.map((customer) => ({
            id: customer.id,
            label: customer.shippingAddress?.fullName || customer.name || customer.email,
            detail: customer.email,
            href: `/admin/users/${customer.id}`,
            keywords: [customer.name, customer.email].filter(Boolean).join(" "),
        })),
    }
}
