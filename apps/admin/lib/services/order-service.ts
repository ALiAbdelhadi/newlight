import { prisma, transitionOrder, type Actor, type OrderStatus } from "@repo/database"

/**
 * Admin order transitions — BUILD §12, §13.2, ADR 0005.
 *
 * This file used to hold the THIRD independent inventory-mutation path. Its `cancelOrder`:
 *
 *   - restored stock with `product.update({ inventory: { increment } })` — the mutable
 *     integer the ledger replaced;
 *   - ran in a plain `$transaction([...])` with no isolation level, unlike the storefront's
 *     Serializable one, so the two disagreed about concurrency;
 *   - kept its OWN list of non-cancellable statuses, which still named `fulfilled` — a value
 *     migration 0010 removed;
 *   - checked ownership when given a userId and skipped it otherwise, so "admin" was inferred
 *     from an argument being absent rather than from a role.
 *
 * All of it is replaced by one call into the shared machine, which releases or returns stock
 * through the ledger, settles payment through the one function that may (F4), records who did
 * it (F1), and is idempotent (F5).
 */

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
    /** Cancel, from whatever state the machine allows an admin to cancel from. */
    static cancelOrder(orderId: string, actor: Actor, reason?: string) {
        return run(orderId, "cancelled", actor, { reason })
    }

    /** Ship: releases the reservation and writes the SALE movement. */
    static shipOrder(orderId: string, actor: Actor, trackingNumber?: string) {
        return run(orderId, "shipped", actor, { trackingNumber })
    }

    /**
     * Confirm delivery. Under COD this is also when the merchant has the cash, so the machine
     * calls settlePaymentForDelivery — which is the ONLY place that maps delivery to payment,
     * and the reason a courier integration later changes one function rather than every screen
     * that reads `paymentStatus === "PAID"` (F4).
     *
     * Idempotent: a double-clicked confirm applies payment once (F5).
     */
    static confirmDelivery(orderId: string, actor: Actor) {
        return run(orderId, "delivered", actor)
    }

    /** Refused on the doorstep, or returned afterwards: a RETURN movement, and it stays unpaid. */
    static returnOrder(orderId: string, actor: Actor, reason?: string) {
        return run(orderId, "cancelled", actor, { reason: reason ?? "returned" })
    }
}
