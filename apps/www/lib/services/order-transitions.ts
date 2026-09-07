import { prisma, resolveLocale, transitionOrder, type Actor, type OrderStatus, type TransitionResult } from "@repo/database"
import { queueMail } from "@repo/mail/outbox"

/**
 * The storefront's binding of the state machine to email.
 *
 * The machine itself cannot queue mail: @repo/mail already depends on @repo/database, so
 * importing it there would close a cycle. Instead the machine takes an `afterTransition` hook
 * that runs INSIDE its transaction, and this is that hook — which is what keeps "the status
 * changed" and "the customer was told" a single atomic fact.
 */
export async function transitionOrderWithNotification(input: {
    orderId: string
    to: OrderStatus
    actor: Actor
    trackingNumber?: string | null
    reason?: string | null
}): Promise<TransitionResult> {
    return transitionOrder(prisma, input, async (tx, result) => {
        if (result.alreadyApplied) return

        const order = await tx.order.findUnique({
            where: { id: result.orderId },
            select: {
                orderNumber: true,
                trackingNumber: true,
                user: { select: { email: true, preferredLanguage: true } },
            },
        })
        if (!order?.user?.email) return

        const locale = resolveLocale(order.user.preferredLanguage)
        await queueMail(tx, {
            template: "order-status-change",
            to: order.user.email,
            locale,
            payload: {
                orderNumber: order.orderNumber,
                status: result.to,
                orderUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/orders/${result.orderId}`,
                trackingNumber: order.trackingNumber ?? undefined,
            },
            // One email per (order, status). A retried transition queues nothing extra, which
            // is the same guarantee the machine gives the ledger (F5).
            dedupeKey: `order-status:${result.orderId}:${result.to}`,
        })
    })
}
