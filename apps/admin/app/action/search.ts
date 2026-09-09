"use server"

import { prisma } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"

/**
 * The command palette's search (P4.5 §10).
 *
 * The palette shipped as navigate-only, with a comment saying record search would land "when a
 * server action exists". One did — `searchProducts` — and nothing imported it: dead code beside
 * a feature that was deferred for want of it.
 *
 * It could not have been used as it stood, either, because it was the STOREFRONT's search
 * moved across: `where: { isActive: true }` and English translations only. A panel whose job
 * includes finding the hidden product and fixing it cannot use a search that filters hidden
 * products out, and one whose catalogue is half Arabic cannot search one language.
 *
 * Three entities, ten rows each, one round trip. Anything beyond ten belongs in the list
 * surface that can filter and page — the palette is for going somewhere, not for browsing.
 */

export interface SearchHit {
    id: string
    /** What is shown. */
    label: string
    /** The identifier under it — SKU, email, order number. */
    detail: string
    href: string
    /** Extra terms the palette matches on but does not display. */
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
    // Two characters is the floor: one character matches most of the catalogue and the query
    // costs the same as a useful one.
    if (term.length < 2) return EMPTY

    const [products, orders, customers] = await Promise.all([
        prisma.product.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { productId: { contains: term, mode: "insensitive" } },
                    { slug: { contains: term, mode: "insensitive" } },
                    // Both languages. A product named only in Arabic is still findable.
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
                // Hidden is stated, because finding a hidden product is usually why you looked.
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
