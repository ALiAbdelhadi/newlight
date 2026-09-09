import { prisma, resolveLocale, transitionOrder, type Actor, type OrderStatus, type TransitionResult } from "@repo/database"
import { queueMail } from "@repo/mail/outbox"
import { adminRecipients, dispatchPushSoon, notifyRecipients } from "@repo/notifications"

/**
 * The storefront's binding of the state machine to email and to notifications.
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
    /*
     * Both halves of the condition are INPUTS, so whether a notification is needed is known
     * before anything opens. Resolving the recipients only when it is means a shipment or a
     * delivery — the common transitions — pay nothing for a query they would discard, and the
     * read stays outside the transaction where it takes no predicate lock.
     */
    const notifiable = input.to === "cancelled" && input.actor.type === "CUSTOMER"
    const recipients = notifiable ? await adminRecipients(prisma) : []

    const result = await transitionOrder(prisma, input, async (tx, result) => {
        if (result.alreadyApplied) return

        const order = await tx.order.findUnique({
            where: { id: result.orderId },
            select: {
                orderNumber: true,
                trackingNumber: true,
                user: { select: { name: true, email: true, preferredLanguage: true } },
            },
        })
        if (!order) return

        /*
         * A cancellation the CUSTOMER made is news to the office: stock has just been
         * released, and something that was going to ship is not. A cancellation an
         * administrator made is not — they are the one who made it, and telling every
         * administrator about each other's actions is how a notification channel becomes
         * noise people stop reading. The other transitions are all admin-driven, so none of
         * them raises a notification here either (§17).
         */
        if (notifiable) {
            await notifyRecipients(tx, recipients, {
                type: "ORDER_CANCELLED",
                title: `Order ${order.orderNumber} cancelled`,
                message: `${order.user?.name ?? "A customer"} cancelled their order.${input.reason ? ` Reason: ${input.reason}` : ""}`,
                actionUrl: `/admin/orders/${result.orderId}`,
                priority: "HIGH",
                metadata: { orderId: result.orderId, orderNumber: order.orderNumber, reason: input.reason ?? null },
            })
        }

        if (!order.user?.email) return

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

    // After the commit, and not awaited — the transition is durable and the person who caused
    // it should not wait on a push service. The cron sweep picks up anything this misses.
    dispatchPushSoon(prisma)

    return result
}
