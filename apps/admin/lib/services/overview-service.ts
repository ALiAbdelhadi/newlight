import {
    ContactFormStatus,
    OrderStatus,
    countLowStock,
    prisma,
    serializeMoney,
    type SerializedMoney,
} from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"

/**
 * The Overview's data (P4.5 §9).
 *
 * The dashboard's job is operational awareness, not analytics: is anything stuck, what changed,
 * what needs somebody today. Every figure this service returns therefore has an ACTION behind
 * it — a queue to open, a gap to fill — and anything that would only be interesting is absent.
 *
 * That is a deliberate reversal. The screen this feeds showed Total Revenue, Total Orders,
 * Customers and Average Order Value in four cards, computed in the browser from EVERY order in
 * the database flattened to one row per line item. Nobody can act on an average order value,
 * and the query behind those four numbers was the most expensive in the application.
 *
 * `attention` is ordered by urgency, not by domain, and each entry carries the href of the
 * surface that resolves it. A count with nowhere to go is a worry, not a task.
 */

export interface AttentionItem {
    id: string
    label: string
    /** What the number means and what doing something about it looks like. */
    detail: string
    count: number
    href: string
    tone: "danger" | "warning" | "neutral"
}

export interface RecentOrder {
    id: string
    orderNumber: string
    customer: string
    total: SerializedMoney
    status: OrderStatus
    createdAt: string
    /** Whole days since it was placed. Drives the "waiting" readout. */
    ageDays: number
}

export interface ActivityEntry {
    id: string
    action: string
    entity: string
    entityId: string
    actorEmail: string | null
    actorType: string | null
    createdAt: string
}

export interface Overview {
    attention: AttentionItem[]
    today: {
        orders: number
        revenue: SerializedMoney
    }
    week: {
        orders: number
        revenue: SerializedMoney
    }
    /** Orders placed but not yet shipped, and how long the oldest has waited. */
    fulfilment: {
        awaiting: number
        oldestWaitDays: number | null
        inTransit: number
    }
    recentOrders: RecentOrder[]
    activity: ActivityEntry[]
    openingCountPending: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(from: Date, to: Date) {
    return Math.floor((to.getTime() - from.getTime()) / DAY_MS)
}

export async function getOverview(): Promise<Overview> {
    await requireCurrentAdmin()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS)
    const threeDaysAgo = new Date(now.getTime() - 3 * DAY_MS)

    const [
        todayAggregate,
        weekAggregate,
        awaiting,
        oldestAwaiting,
        inTransit,
        untracked,
        noAddress,
        unreadContacts,
        staleContacts,
        lowStock,
        withoutCost,
        untranslated,
        openingSetting,
        recentOrderRows,
        activityRows,
    ] = await Promise.all([
        prisma.order.aggregate({
            where: { createdAt: { gte: startOfToday }, status: { not: OrderStatus.cancelled } },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma.order.aggregate({
            where: { createdAt: { gte: weekAgo }, status: { not: OrderStatus.cancelled } },
            _count: { _all: true },
            _sum: { total: true },
        }),
        prisma.order.count({ where: { status: OrderStatus.awaiting_shipment } }),
        prisma.order.findFirst({
            where: { status: OrderStatus.awaiting_shipment },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
        }),
        prisma.order.count({ where: { status: OrderStatus.shipped } }),
        prisma.order.count({
            where: { status: OrderStatus.shipped, OR: [{ trackingNumber: null }, { trackingNumber: "" }] },
        }),
        prisma.order.count({
            where: { shippingAddressId: null, status: { in: [OrderStatus.awaiting_shipment, OrderStatus.shipped] } },
        }),
        prisma.contactForm.count({ where: { isRead: false } }),
        prisma.contactForm.count({
            where: {
                isRead: false,
                createdAt: { lt: threeDaysAgo },
                status: { notIn: [ContactFormStatus.CLOSED, ContactFormStatus.SPAM] },
            },
        }),
        countLowStock(prisma, 10),
        prisma.product.count({ where: { deletedAt: null, averageCost: null } }),
        prisma.product.count({ where: { deletedAt: null, translations: { none: { locale: "ar" } } } }),
        prisma.systemSetting.findUnique({ where: { key: "inventory.opening_count_pending" } }),
        prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
                id: true,
                orderNumber: true,
                total: true,
                status: true,
                createdAt: true,
                user: { select: { name: true, email: true } },
                shippingAddress: { select: { fullName: true } },
            },
        }),
        prisma.adminAuditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                action: true,
                entity: true,
                entityId: true,
                actorEmail: true,
                actorType: true,
                createdAt: true,
            },
        }),
    ])

    const oldestWaitDays = oldestAwaiting ? daysBetween(oldestAwaiting.createdAt, now) : null

    /*
     * Built as a list and then filtered to the non-zero entries. A dashboard that renders
     * "Low stock: 0" in the same slot as "Low stock: 14" trains people to read the whole panel
     * every time; one that shows only what is actually outstanding is read in a glance, and an
     * empty panel is itself the answer.
     */
    const attention: AttentionItem[] = ([
        {
            id: "no-address",
            label: "Orders with no address",
            detail: "Cannot be dispatched at all until somebody captures one.",
            count: noAddress,
            href: "/admin/orders?address=missing",
            tone: "danger",
        },
        {
            id: "stale-contacts",
            label: "Enquiries unopened over 3 days",
            detail: "Nobody has read them.",
            count: staleContacts,
            href: "/admin/contact?read=unread",
            tone: "danger",
        },
        {
            id: "awaiting",
            label: "Orders awaiting shipment",
            detail:
                oldestWaitDays === null
                    ? "Nothing waiting."
                    : `The oldest has waited ${oldestWaitDays === 0 ? "less than a day" : `${oldestWaitDays} day${oldestWaitDays === 1 ? "" : "s"}`}.`,
            count: awaiting,
            href: "/admin/shipping",
            tone: oldestWaitDays !== null && oldestWaitDays >= 3 ? "danger" : "warning",
        },
        {
            id: "untracked",
            label: "Shipped without tracking",
            detail: "Nobody can answer a question about where the parcel is.",
            count: untracked,
            href: "/admin/orders?tracking=missing",
            tone: "warning",
        },
        {
            id: "unread-contacts",
            label: "Unread enquiries",
            detail: "Submissions nobody has opened yet.",
            count: unreadContacts,
            href: "/admin/contact?read=unread",
            tone: "warning",
        },
        {
            id: "low-stock",
            label: "Products low on stock",
            detail: "Fewer than 10 available after reservations.",
            count: lowStock,
            href: "/admin/inventory",
            tone: "warning",
        },
        {
            id: "untranslated",
            label: "Products with no Arabic",
            detail: "They fall back to the English name on an Arabic page.",
            count: untranslated,
            href: "/admin/translations",
            tone: "neutral",
        },
        {
            id: "no-cost",
            label: "Products with no cost",
            detail: "Margin cannot be reported until a cost is recorded.",
            count: withoutCost,
            href: "/admin/inventory",
            tone: "neutral",
        },
    ] satisfies AttentionItem[]).filter((item) => item.count > 0)

    return {
        attention,
        today: {
            orders: todayAggregate._count._all,
            revenue: serializeMoney(todayAggregate._sum.total ?? 0),
        },
        week: {
            orders: weekAggregate._count._all,
            revenue: serializeMoney(weekAggregate._sum.total ?? 0),
        },
        fulfilment: { awaiting, oldestWaitDays, inTransit },
        recentOrders: recentOrderRows.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customer: order.shippingAddress?.fullName || order.user.name || order.user.email,
            total: serializeMoney(order.total),
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            ageDays: daysBetween(order.createdAt, now),
        })),
        activity: activityRows.map((row) => ({
            id: row.id,
            action: row.action,
            entity: row.entity,
            entityId: row.entityId,
            actorEmail: row.actorEmail,
            actorType: row.actorType,
            createdAt: row.createdAt.toISOString(),
        })),
        openingCountPending: openingSetting?.value === "true",
    }
}
