import type { Prisma } from "@repo/database"

// Re-exported rather than restated. The notification bell needs the two enums on the
// client, and a hand-written copy of a Prisma enum is a copy that goes stale the first
// time someone adds a case to the schema.
export type { NotificationType, NotificationPriority } from "@repo/database"

/**
 * Order shape returned by `getOrderDetails` in app/action/order.ts.
 * Derived from that query so the two cannot drift.
 */
export type OrderWithDetails = Prisma.OrderGetPayload<{
    include: {
        items: {
            include: {
                product: { include: { translations: true } }
                configuration: true
            }
        }
        shippingAddress: true
        configuration: true
    }
}>

/**
 * Order shape rendered by the admin order detail page, which additionally
 * selects the customer. Note the User model has no `firstName` column — the
 * page previously declared one, which Prisma types as `never`.
 */
export type OrderWithCustomer = Prisma.OrderGetPayload<{
    include: {
        shippingAddress: true
        user: { select: { id: true; email: true; phoneNumber: true } }
        items: {
            include: {
                product: { include: { translations: true } }
                configuration: true
            }
        }
        configuration: true
    }
}>

/**
 * Sidebar / layout counters returned by `getDashboardStats`.
 *
 * Previously declared three times with two different shapes: components/sidebar.tsx
 * included `contacts` and rendered a badge from it, while the action never returned
 * the field, so the badge could never appear.
 */
export type DashboardStats = {
    orders: number
    shipping: number
    notifications: number
    reviews: number
    products: number
    customers: number
    contacts: number
    /** Products with no Arabic translation row at all — the floor of the §13.2 item 7 queue. */
    untranslated: number
}
