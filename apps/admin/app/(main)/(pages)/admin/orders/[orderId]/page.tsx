import { notFound } from "next/navigation"
import { prisma, serializeMoney, serializeMoneyOrNull } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"
import { OrderRecord } from "./order-record"

export const dynamic = "force-dynamic"

/**
 * One order (P4.5 §12).
 *
 * Everything the record needs, selected explicitly and serialized here. The query this
 * replaces `include`d each line's whole product row and that product's translations to render
 * a name the ORDER already stores (`OrderItem.productName`, captured at checkout so a later
 * rename cannot rewrite history), and handed the resulting Decimals straight to a client
 * component — the defect ADR 0001 exists to prevent, and the source of the console errors on
 * this route.
 */
export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    await requireCurrentAdmin()
    const { orderId } = await params

    const [order, audit] = await Promise.all([
        prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                paymentMethod: true,
                shippingOption: true,
                subtotal: true,
                tax: true,
                shippingCost: true,
                total: true,
                trackingNumber: true,
                paidAt: true,
                shippedAt: true,
                deliveredAt: true,
                customerNotes: true,
                adminNotes: true,
                createdAt: true,
                updatedAt: true,
                user: { select: { id: true, name: true, email: true, phoneNumber: true } },
                shippingAddress: true,
                items: {
                    select: {
                        id: true,
                        productId: true,
                        productName: true,
                        productImage: true,
                        price: true,
                        quantity: true,
                        selectedColorTemp: true,
                        selectedColorKey: true,
                    },
                },
            },
        }),
        prisma.adminAuditLog.findMany({
            where: { entity: "Order", entityId: orderId },
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { id: true, action: true, actorEmail: true, actorType: true, createdAt: true },
        }),
    ])

    if (!order) notFound()

    return (
        <OrderRecord
            order={{
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                shippingOption: order.shippingOption,
                subtotal: serializeMoney(order.subtotal),
                tax: serializeMoneyOrNull(order.tax),
                shippingCost: serializeMoney(order.shippingCost),
                total: serializeMoney(order.total),
                trackingNumber: order.trackingNumber,
                paidAt: order.paidAt?.toISOString() ?? null,
                shippedAt: order.shippedAt?.toISOString() ?? null,
                deliveredAt: order.deliveredAt?.toISOString() ?? null,
                customerNotes: order.customerNotes,
                adminNotes: order.adminNotes,
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString(),
                customer: {
                    id: order.user.id,
                    name: order.user.name,
                    email: order.user.email,
                    phone: order.user.phoneNumber,
                },
                address: order.shippingAddress
                    ? {
                          fullName: order.shippingAddress.fullName,
                          phone: order.shippingAddress.phone,
                          addressLine1: order.shippingAddress.addressLine1,
                          addressLine2: order.shippingAddress.addressLine2,
                          city: order.shippingAddress.city,
                          state: order.shippingAddress.state,
                          postalCode: order.shippingAddress.postalCode,
                          country: order.shippingAddress.country,
                      }
                    : null,
                items: order.items.map((item) => ({
                    id: item.id,
                    productId: item.productId,
                    productName: item.productName,
                    productImage: item.productImage,
                    price: serializeMoney(item.price),
                    quantity: item.quantity,
                    colorTemp: item.selectedColorTemp,
                    colorKey: item.selectedColorKey,
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
