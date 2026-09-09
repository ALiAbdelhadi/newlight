import { notFound } from "next/navigation"
import { prisma, serializeMoney } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"
import { CustomerRecord } from "./customer-record"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * A customer record (P4.5 §12).
 *
 * What this replaces logged the route params, the whole Prisma result and a summary of it to
 * the server console on every request — including the customer's email and address — then
 * rendered a page whose order table declared fourteen column headers over eleven cells, so
 * every value below "Price" sat under the wrong heading. Its tab strip had five tabs and one
 * `TabsContent`: choosing any tab except "All Orders" rendered an empty panel. Its order links
 * pointed at `/admin/dashboard/orders/<id>`, which is not a route.
 *
 * It is rebuilt on `RecordLayout`, the same shape as a product, so the status, the identifiers
 * and the audit trail are where an operator has already learned to look.
 *
 * The unbounded `include` is gone as well: the orders are selected with the four fields the
 * table shows plus a line count, rather than every line item with its full product row.
 */
export default async function CustomerPage({ params }: { params: Promise<{ userId: string }> }) {
    await requireCurrentAdmin()
    const { userId } = await params

    const [user, audit] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                preferredLanguage: true,
                preferredCurrency: true,
                createdAt: true,
                updatedAt: true,
                shippingAddress: true,
                orders: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        paymentStatus: true,
                        total: true,
                        shippingCost: true,
                        trackingNumber: true,
                        createdAt: true,
                        deliveredAt: true,
                        _count: { select: { items: true } },
                    },
                },
            },
        }),
        prisma.adminAuditLog.findMany({
            where: { entity: "User", entityId: userId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                action: true,
                actorEmail: true,
                actorType: true,
                createdAt: true,
            },
        }),
    ])

    if (!user) notFound()

    return (
        <CustomerRecord
            customer={{
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phoneNumber,
                role: user.role,
                preferredLanguage: user.preferredLanguage,
                preferredCurrency: user.preferredCurrency,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                address: user.shippingAddress
                    ? {
                          fullName: user.shippingAddress.fullName,
                          phone: user.shippingAddress.phone,
                          email: user.shippingAddress.email,
                          addressLine1: user.shippingAddress.addressLine1,
                          addressLine2: user.shippingAddress.addressLine2,
                          city: user.shippingAddress.city,
                          state: user.shippingAddress.state,
                          postalCode: user.shippingAddress.postalCode,
                          country: user.shippingAddress.country,
                      }
                    : null,
                orders: user.orders.map((order) => ({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    total: serializeMoney(order.total),
                    shippingCost: serializeMoney(order.shippingCost),
                    lines: order._count.items,
                    trackingNumber: order.trackingNumber,
                    createdAt: order.createdAt.toISOString(),
                    deliveredAt: order.deliveredAt?.toISOString() ?? null,
                })),
            }}
            audit={audit.map((entry) => ({
                id: entry.id,
                action: entry.action,
                actorEmail: entry.actorEmail,
                actorType: entry.actorType,
                createdAt: entry.createdAt.toISOString(),
            }))}
        />
    )
}
