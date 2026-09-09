import { prisma, resolveLocale, transitionOrder, type Actor, type OrderStatus, type Prisma } from "@repo/database"
import { queueMail } from "@repo/mail/outbox"

export interface TransitionOutcome {
    success: boolean
    message?: string
    error?: string
    alreadyApplied?: boolean
}

// The storefront's transitionOrderWithNotification does the same thing for customer-initiated
// moves. Every status change the admin makes is one the customer is told about — the shipping
// dialog and the cancel dialog both promise it — so the mail is queued inside the same
// transaction as the transition, deduplicated per (order, status) like the storefront's.
async function mailCustomer(tx: Prisma.TransactionClient, orderId: string, to: OrderStatus) {
    const order = await tx.order.findUnique({
        where: { id: orderId },
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
            status: to,
            orderUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/orders/${orderId}`,
            trackingNumber: order.trackingNumber ?? undefined,
        },
        dedupeKey: `order-status:${orderId}:${to}`,
    })
}

async function run(orderId: string, to: OrderStatus, actor: Actor, extra?: { trackingNumber?: string; reason?: string }): Promise<TransitionOutcome> {
    try {
        const result = await transitionOrder(
            prisma,
            {
                orderId,
                to,
                actor,
                trackingNumber: extra?.trackingNumber ?? null,
                reason: extra?.reason ?? null,
            },
            async (tx, outcome) => {
                if (outcome.alreadyApplied) return
                await mailCustomer(tx, outcome.orderId, outcome.to)
            }
        )
        return {
            success: true,
            alreadyApplied: result.alreadyApplied,
            message: result.alreadyApplied ? `Order was already ${to}.` : `Order moved to ${to}.`,
        }
    } catch (error) {
        console.error(`OrderService.${to} error:`, error)
        return { success: false, error: error instanceof Error ? error.message : "Transition failed" }
    }
}

export class OrderService {
    static cancelOrder(orderId: string, actor: Actor, reason?: string) {
        return run(orderId, "cancelled", actor, { reason })
    }

    static shipOrder(orderId: string, actor: Actor, trackingNumber?: string) {
        return run(orderId, "shipped", actor, { trackingNumber })
    }

    static confirmDelivery(orderId: string, actor: Actor) {
        return run(orderId, "delivered", actor)
    }

    static returnOrder(orderId: string, actor: Actor, reason?: string) {
        return run(orderId, "cancelled", actor, { reason: reason ?? "returned" })
    }
}
