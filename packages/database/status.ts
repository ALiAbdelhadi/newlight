import type { OrderStatus, PaymentStatus } from "@prisma/client"

import type { Locale } from "./locale"

/**
 * The customer-facing status vocabulary — BUILD §18, §19.
 *
 * This lives beside the state machine, in the domain layer, for the reason the machine itself
 * gives: a vocabulary declared in one application and re-implemented in the other is not one
 * vocabulary. Before this file the same four order statuses were named in FOUR places —
 *
 *   apps/admin/lib/status.ts               "Awaiting shipment"
 *   apps/admin/components/status-dropdown   "Awaiting Shipment"   (deleted in P4.5)
 *   apps/www/.../order-details.tsx          "Awaiting Shipment" + Arabic, hand-written
 *   apps/www/components/order-status-timeline
 *
 * — and two of them had already drifted on capitalisation, while the storefront's copy still
 * carried `processing` and `fulfilled`, statuses migration 0010 removed from the enum. A
 * customer could therefore be shown a status the database cannot store.
 *
 * WHAT IS HERE AND WHAT IS NOT. This file holds the WORDS: what each status is called, in both
 * languages the storefront serves, and one sentence explaining it to a customer. It holds no
 * colours, no icons and no components, so it stays dependency-free and importable from a test,
 * a server action, an email template or either application.
 *
 * PRESENTATION STAYS IN THE APPS. `apps/admin/lib/status.ts` maps these to badge variants and
 * lucide icons for an operator; the storefront maps them to its own tone scale. Both take the
 * label from here, so they cannot disagree about what a thing is called while disagreeing
 * legitimately about how it should look.
 *
 * THE TONE IS A DOMAIN FACT, not a design one. "Cancelled" is a negative outcome and
 * "delivered" is a positive one in every interface that will ever render them; which exact red
 * or green expresses that is the app's business, and the token names are shared anyway.
 */

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

export interface StatusCopy {
    /** The label, per locale. */
    label: Record<Locale, string>
    /**
     * One sentence a CUSTOMER can act on. Deliberately not the operator's description — the
     * state machine's `description` field says "the reservation becomes a SALE movement",
     * which is true and is not something to show a person waiting for a lamp.
     */
    description: Record<Locale, string>
    tone: StatusTone
}

/**
 * Order status.
 *
 * Four values, matching the enum exactly. `processing`, `fulfilled` and `refunded` are absent
 * because 0010 pruned them; if one is ever reinstated it is added here first, and both
 * applications pick it up.
 */
export const ORDER_STATUS_COPY: Record<OrderStatus, StatusCopy> = {
    awaiting_shipment: {
        label: { en: "Awaiting shipment", ar: "في انتظار الشحن" },
        description: {
            en: "We have your order and are preparing it. You can still cancel it at this stage.",
            ar: "استلمنا طلبك ونقوم بتجهيزه. لا يزال بإمكانك إلغاؤه في هذه المرحلة.",
        },
        tone: "warning",
    },
    shipped: {
        label: { en: "Shipped", ar: "تم الشحن" },
        description: {
            en: "Your order has left our warehouse and is on its way to you.",
            ar: "غادر طلبك المستودع وهو في طريقه إليك.",
        },
        tone: "info",
    },
    delivered: {
        label: { en: "Delivered", ar: "تم التسليم" },
        description: {
            en: "Your order has been delivered.",
            ar: "تم تسليم طلبك.",
        },
        tone: "success",
    },
    cancelled: {
        label: { en: "Cancelled", ar: "ملغي" },
        description: {
            en: "This order was cancelled and will not be delivered. Nothing was charged.",
            ar: "تم إلغاء هذا الطلب ولن يتم تسليمه. لم يتم تحصيل أي مبلغ.",
        },
        tone: "danger",
    },
}

/**
 * Payment status.
 *
 * Under cash on delivery PENDING is the NORMAL state for the entire life of an order until the
 * courier hands it over, so its customer-facing wording says what will happen rather than
 * implying something is outstanding. `settlePaymentForDelivery` is the only thing that moves it
 * to PAID (F4).
 */
export const PAYMENT_STATUS_COPY: Record<PaymentStatus, StatusCopy> = {
    PENDING: {
        label: { en: "Pay on delivery", ar: "الدفع عند الاستلام" },
        description: {
            en: "You pay the courier in cash when the order arrives.",
            ar: "تدفع لمندوب التوصيل نقدًا عند وصول الطلب.",
        },
        tone: "neutral",
    },
    PAID: {
        label: { en: "Paid", ar: "مدفوع" },
        description: {
            en: "Payment received. Nothing further is owed.",
            ar: "تم استلام الدفعة. لا يوجد مبلغ مستحق.",
        },
        tone: "success",
    },
    REFUNDED: {
        label: { en: "Refunded", ar: "تم رد المبلغ" },
        description: {
            en: "The amount for this order has been returned to you.",
            ar: "تم رد قيمة هذا الطلب إليك.",
        },
        tone: "warning",
    },
    FAILED: {
        label: { en: "Payment failed", ar: "فشل الدفع" },
        description: {
            en: "The payment could not be completed. Contact us and we will sort it out.",
            ar: "تعذّر إتمام الدفع. تواصل معنا وسنقوم بحلّها.",
        },
        tone: "danger",
    },
}

/**
 * The fulfilment ladder, in order, for a progress readout.
 *
 * `cancelled` is deliberately NOT a step: it is an exit from the ladder, not a position on it,
 * and a UI that renders it as the last of four steps tells a customer their cancelled order is
 * nearly delivered. Anything drawing the ladder must handle cancellation separately.
 */
export const ORDER_LADDER = ["awaiting_shipment", "shipped", "delivered"] as const satisfies readonly OrderStatus[]

/**
 * The three statuses that are positions ON the ladder — narrower than `OrderStatus`, which
 * also contains `cancelled`. `as const` above rather than a `readonly OrderStatus[]`
 * annotation is what makes this union the three literals instead of all four: a UI that keys a
 * record by a ladder step must not be asked for a `cancelled` entry it cannot have.
 */
export type OrderLadderStep = (typeof ORDER_LADDER)[number]

export function orderStatusLabel(status: OrderStatus, locale: Locale): string {
    return ORDER_STATUS_COPY[status].label[locale]
}

export function paymentStatusLabel(status: PaymentStatus, locale: Locale): string {
    return PAYMENT_STATUS_COPY[status].label[locale]
}

/**
 * How far along the ladder an order is, as an index — or `null` when it is not on the ladder.
 *
 * Returning null for `cancelled` rather than 0 or 3 is the point: the caller is forced to
 * decide what cancellation looks like instead of being handed a number that renders as
 * "not started" (which is what the storefront's old `getOrderProgress` returned).
 */
export function orderLadderIndex(status: OrderStatus): number | null {
    // The widening cast is needed because ORDER_LADDER is a literal tuple: its own `indexOf`
    // only accepts the three values it contains, and the question being asked here is exactly
    // "is this one of them".
    const index = (ORDER_LADDER as readonly OrderStatus[]).indexOf(status)
    return index === -1 ? null : index
}
