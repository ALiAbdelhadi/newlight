/**
 * The order state machine — BUILD §12, ADR 0005, foundations F1-F5.
 *
 * Before this, `updateOrderStatus` accepted ANY of the seven statuses from ANY authenticated
 * user who owned the order, and set shippedAt / deliveredAt accordingly. The only check was
 * `where: { id, userId }` — ownership was verified, role was not. A customer could mark their
 * own order delivered.
 *
 * It lives in @repo/database rather than in apps/www because the ADMIN app performs most
 * transitions. A machine declared in one app and re-implemented in the other is not one
 * machine, and "declared in one place" is the whole of F2.
 *
 * Four properties, each of which was absent:
 *
 *   F1  Every transition records WHO caused it — actorType plus the actor's id — in
 *       AdminAuditLog. Nothing recorded that before.
 *   F2  Transitions are declared as (from, to, allowedActorTypes), with WEBHOOK in the enum
 *       before anything emits it. A machine written assuming only customers and admins means
 *       reworking authorization on every transition when a courier lands, instead of adding
 *       one row here.
 *   F4  PaymentStatus.PAID means money received by the merchant. The delivery-to-payment
 *       mapping lives in exactly one function, settlePaymentForDelivery, and is NEVER inlined
 *       into the delivered transition — so adding COLLECTED / SETTLED later changes one
 *       function and nothing else.
 *   F5  Transitions are IDEMPOTENT as a property of the machine, not as a UI double-click
 *       guard. A retried delivery event must not apply payment or stock twice, and the UI is
 *       not where retries happen.
 */
import type { ActorType, OrderStatus, Prisma, PrismaClient } from "@prisma/client"
import { DEFAULT_LOCATION_ID, recordMovement, release } from "./inventory"

export interface Transition {
    from: OrderStatus
    to: OrderStatus
    /** Who may cause it. WEBHOOK is listed where a courier would eventually drive it. */
    actors: readonly ActorType[]
    description: string
}

/**
 * THE table. Every legal transition, and nothing else is legal.
 *
 * `processing`, `fulfilled` and `refunded` are absent because migration 0010 pruned them: no
 * production row held them and no code assigned them.
 */
export const TRANSITIONS: readonly Transition[] = [
    {
        from: "awaiting_shipment",
        to: "shipped",
        actors: ["ADMIN", "SYSTEM", "WEBHOOK"],
        description: "Stock leaves the warehouse: the reservation becomes a SALE movement.",
    },
    {
        from: "awaiting_shipment",
        to: "cancelled",
        // The ONLY transition a customer may cause, and only on their own order — ownership
        // is the caller's check, the role is this one's.
        actors: ["CUSTOMER", "ADMIN", "SYSTEM"],
        description: "Cancelled before shipping: the reservation is released, nothing moved.",
    },
    {
        from: "shipped",
        to: "delivered",
        actors: ["ADMIN", "WEBHOOK"],
        description: "Delivery confirmed. Payment settles through settlePaymentForDelivery (F4).",
    },
    {
        from: "shipped",
        to: "cancelled",
        actors: ["ADMIN", "WEBHOOK"],
        description: "Refused or returned after shipping: a RETURN movement, and it stays unpaid.",
    },
    {
        from: "delivered",
        to: "cancelled",
        // Deliberately admin-only and deliberately allowed: a return after delivery is a real
        // event, and ADR 0005 asks for it to be an explicit compensating action rather than
        // an edit to history.
        actors: ["ADMIN"],
        description: "Returned after delivery: a RETURN movement and a refund.",
    },
]

export function allowedTransitionsFrom(status: OrderStatus, actor: ActorType): OrderStatus[] {
    return TRANSITIONS.filter((t) => t.from === status && t.actors.includes(actor)).map((t) => t.to)
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: ActorType): boolean {
    return TRANSITIONS.some((t) => t.from === from && t.to === to && t.actors.includes(actor))
}

export class IllegalTransitionError extends Error {
    constructor(
        readonly from: OrderStatus,
        readonly to: OrderStatus,
        readonly actor: ActorType
    ) {
        const exists = TRANSITIONS.some((t) => t.from === from && t.to === to)
        super(
            exists
                ? `a ${actor} may not move an order from ${from} to ${to}`
                : `${from} -> ${to} is not a legal transition`
        )
        this.name = "IllegalTransitionError"
    }
}

export interface Actor {
    type: ActorType
    id?: string | null
    email?: string | null
}

export interface TransitionInput {
    orderId: string
    to: OrderStatus
    actor: Actor
    /** Recorded on the order when shipping. Manual under COD (F3). */
    trackingNumber?: string | null
    /** Mandatory in spirit for cancellations; recorded on the audit row. */
    reason?: string | null
}

export interface TransitionResult {
    orderId: string
    from: OrderStatus
    to: OrderStatus
    /** True when the order was already in the target state and nothing was applied (F5). */
    alreadyApplied: boolean
    movements: number
    paymentSettled: boolean
}

/**
 * Runs INSIDE the transaction, after the status change and its stock effects, before commit.
 *
 * It exists so an app can queue a status-change email in the same transaction without
 * @repo/database having to import @repo/mail — which would close a cycle, since @repo/mail
 * already depends on this package.
 */
export type AfterTransition = (
    tx: Prisma.TransactionClient,
    result: TransitionResult
) => Promise<void>

/**
 * PAID means MONEY RECEIVED BY THE MERCHANT, nothing weaker (F4).
 *
 * Under manual COD, the owner confirming delivery means the owner has the cash, so delivery
 * and payment coincide and this sets PAID. Under a courier they do not: the courier collects
 * on delivery and the money reaches the merchant days later, minus fees — a different fact,
 * and the one that reconciles against a bank statement.
 *
 * Keeping that mapping in ONE function is what makes adding COLLECTED and SETTLED an enum
 * addition plus an edit here, rather than a semantic rewrite of every call site that ever
 * checked `paymentStatus === "PAID"`.
 */
export async function settlePaymentForDelivery(
    tx: Prisma.TransactionClient,
    orderId: string
): Promise<boolean> {
    const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { paymentStatus: true, paymentMethod: true, paidAt: true },
    })
    if (!order) return false

    // Idempotent: a retried delivery event must not re-stamp paidAt (F5).
    if (order.paymentStatus === "PAID") return false

    if (order.paymentMethod !== "COD") {
        // No other method exists yet. When one does, its settlement belongs here and nowhere
        // else, which is the entire point of this function.
        return false
    }

    await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "PAID", paidAt: new Date() },
    })
    return true
}

/**
 * Apply a transition, or refuse it.
 *
 * Everything — the status change, the stock movements, the payment settlement and the audit
 * row — happens in ONE transaction. A shipped order whose SALE movement failed to write is
 * not a state this can reach.
 */
export async function transitionOrder(
    prisma: PrismaClient,
    input: TransitionInput,
    afterTransition?: AfterTransition
): Promise<TransitionResult> {
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: input.orderId },
            select: {
                id: true,
                status: true,
                orderNumber: true,
                items: { select: { id: true, productId: true, quantity: true } },
            },
        })
        if (!order) throw new Error(`order ${input.orderId} not found`)

        // F5. Checked before the legality check on purpose: re-delivering a delivered order
        // is a retry, not an illegal transition, and answering "illegal" would make a webhook
        // retry look like an attack.
        if (order.status === input.to) {
            return {
                orderId: order.id,
                from: order.status,
                to: input.to,
                alreadyApplied: true,
                movements: 0,
                paymentSettled: false,
            }
        }

        if (!canTransition(order.status, input.to, input.actor.type)) {
            throw new IllegalTransitionError(order.status, input.to, input.actor.type)
        }

        const from = order.status
        let movements = 0

        // --- stock effects (§8.3) -------------------------------------------------------
        if (input.to === "shipped") {
            // The reservation becomes a real movement: release the claim, then record that
            // the stock physically left.
            for (const item of order.items) {
                await release(tx, item.productId, item.quantity)
                const result = await recordMovement(tx, {
                    productId: item.productId,
                    locationId: DEFAULT_LOCATION_ID,
                    type: "SALE",
                    quantity: -item.quantity,
                    reason: `order ${order.orderNumber} shipped`,
                    referenceType: "order",
                    referenceId: order.id,
                    actorType: input.actor.type,
                    actorId: input.actor.id ?? null,
                })
                if (!result.deduplicated) movements++
            }
        } else if (input.to === "cancelled" && from === "awaiting_shipment") {
            // Nothing moved, so there is nothing to record — writing a movement here would
            // put a fiction in an append-only ledger.
            for (const item of order.items) {
                await release(tx, item.productId, item.quantity)
            }
        } else if (input.to === "cancelled" && (from === "shipped" || from === "delivered")) {
            // Stock physically comes back. A compensating movement, never an edit to the SALE.
            for (const item of order.items) {
                const result = await recordMovement(tx, {
                    productId: item.productId,
                    locationId: DEFAULT_LOCATION_ID,
                    type: "RETURN",
                    quantity: item.quantity,
                    reason: input.reason ?? `order ${order.orderNumber} returned`,
                    referenceType: "order-return",
                    referenceId: order.id,
                    actorType: input.actor.type,
                    actorId: input.actor.id ?? null,
                })
                if (!result.deduplicated) movements++
            }
        }

        // --- the order row --------------------------------------------------------------
        const data: Prisma.OrderUpdateInput = { status: input.to }
        if (input.to === "shipped") {
            data.shippedAt = new Date()
            if (input.trackingNumber) data.trackingNumber = input.trackingNumber
        }
        if (input.to === "delivered") data.deliveredAt = new Date()
        // A refund on a delivered order: the money went out again, and PaymentStatus says so.
        if (input.to === "cancelled" && from === "delivered") data.paymentStatus = "REFUNDED"

        await tx.order.update({ where: { id: order.id }, data })

        // --- payment (F4) ---------------------------------------------------------------
        const paymentSettled = input.to === "delivered" ? await settlePaymentForDelivery(tx, order.id) : false

        // --- audit (F1) -----------------------------------------------------------------
        await tx.adminAuditLog.create({
            data: {
                actorType: input.actor.type,
                actorId: input.actor.id ?? null,
                actorEmail: input.actor.email ?? null,
                action: `order.${from}->${input.to}`,
                entity: "Order",
                entityId: order.id,
                diff: {
                    from,
                    to: input.to,
                    movements,
                    paymentSettled,
                    ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
                    ...(input.reason ? { reason: input.reason } : {}),
                },
            },
        })

        const result: TransitionResult = {
            orderId: order.id,
            from,
            to: input.to,
            alreadyApplied: false,
            movements,
            paymentSettled,
        }

        if (afterTransition) await afterTransition(tx, result)
        return result
    })
}

/**
 * Which roles may use the admin panel.
 *
 * Here rather than in `apps/admin/lib/auth.ts` because it is a domain fact, not an app
 * detail — the storefront needs it to decide whether to show an admin link, and a test needs
 * it without importing a module that builds an auth instance and throws on a missing secret.
 */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: string | null | undefined): role is AdminRole {
    return role != null && (ADMIN_ROLES as readonly string[]).includes(role)
}
