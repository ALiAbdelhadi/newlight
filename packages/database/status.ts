import type { OrderStatus, PaymentStatus } from "./generated/prisma/client"

import type { Locale } from "./locale"

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

export interface StatusCopy {
    label: Record<Locale, string>
    description: Record<Locale, string>
    tone: StatusTone
}

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

export const ORDER_LADDER = ["awaiting_shipment", "shipped", "delivered"] as const satisfies readonly OrderStatus[]

export type OrderLadderStep = (typeof ORDER_LADDER)[number]

export function orderStatusLabel(status: OrderStatus, locale: Locale): string {
    return ORDER_STATUS_COPY[status].label[locale]
}

export function paymentStatusLabel(status: PaymentStatus, locale: Locale): string {
    return PAYMENT_STATUS_COPY[status].label[locale]
}

export function orderLadderIndex(status: OrderStatus): number | null {
    const index = (ORDER_LADDER as readonly OrderStatus[]).indexOf(status)
    return index === -1 ? null : index
}
