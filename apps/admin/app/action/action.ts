"use server"

import { revalidatePath } from "next/cache"
import { prisma, type OrderStatus } from "@repo/database"
import { OrderService } from "@/lib/services/order-service"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

export const changeOrderStatus = async ({
    id,
    newStatus,
    trackingNumber,
    reason,
}: {
    id: string
    newStatus: OrderStatus
    trackingNumber?: string
    reason?: string
}) => {
    const admin = await requireCurrentAdmin()
    const actor = { type: "ADMIN" as const, id: admin.id, email: admin.email }

    const result =
        newStatus === "shipped"
            ? await OrderService.shipOrder(id, actor, trackingNumber)
            : newStatus === "delivered"
              ? await OrderService.confirmDelivery(id, actor)
              : newStatus === "cancelled"
                ? await OrderService.cancelOrder(id, actor, reason)
                : { success: false, error: `no transition to ${newStatus}` }

    if (result.success) {
        revalidatePath("/admin/orders")
        revalidatePath(`/admin/orders/${id}`)
        await revalidateStorefront({ kind: "all" })
    }
    return result
}

export const setTrackingNumber = async (orderId: string, trackingNumber: string) => {
    const admin = await requireCurrentAdmin()
    const value = trackingNumber.trim() || null

    const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { orderNumber: true, status: true, trackingNumber: true },
    })

    if (order.status === "awaiting_shipment") {
        return { success: false as const, error: "This order has not shipped yet." }
    }
    if (order.trackingNumber === value) {
        return { success: true as const, unchanged: true }
    }

    await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { trackingNumber: value } })
        await tx.adminAuditLog.create({
            data: {
                actorType: "ADMIN",
                actorId: admin.id,
                actorEmail: admin.email,
                action: "order.tracking_number",
                entity: "Order",
                entityId: orderId,
                diff: { orderNumber: order.orderNumber, from: order.trackingNumber, to: value },
            },
        })
    })

    revalidatePath("/admin/orders")
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath("/admin/shipping")
    return { success: true as const, unchanged: false }
}
