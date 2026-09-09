import { prisma, transitionOrder, type Actor, type OrderStatus } from "@repo/database"

export interface TransitionOutcome {
    success: boolean
    message?: string
    error?: string
    alreadyApplied?: boolean
}

async function run(orderId: string, to: OrderStatus, actor: Actor, extra?: { trackingNumber?: string; reason?: string }): Promise<TransitionOutcome> {
    try {
        const result = await transitionOrder(prisma, {
            orderId,
            to,
            actor,
            trackingNumber: extra?.trackingNumber ?? null,
            reason: extra?.reason ?? null,
        })
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
