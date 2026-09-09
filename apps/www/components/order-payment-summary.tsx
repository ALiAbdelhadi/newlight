"use client"

import { formatMoney, type SerializedMoney } from "@repo/database"
import { useLocale } from "next-intl"
import { CreditCard } from "lucide-react"

interface OrderPaymentSummaryProps {
    // Serialised money (ADR 0001) — a Decimal cannot cross the server/client boundary.
    subtotal: SerializedMoney
    shippingCost: SerializedMoney
    total: SerializedMoney
    translations: {
        paymentSummary: string
        subtotal: string
        shipping: string
        total: string
    }
}

export function OrderPaymentSummary({
    subtotal,
    shippingCost,
    total,
    translations: t
}: OrderPaymentSummaryProps) {
    const locale = useLocale()
    return (
        <section aria-labelledby="payment-summary" className="rounded-lg border bg-card p-6">
            <div className="mb-6 flex items-center gap-2">
                <CreditCard aria-hidden className="size-5 text-muted-foreground" />
                <h2 id="payment-summary" className="text-lg font-semibold tracking-tight">
                    {t.paymentSummary}
                </h2>
            </div>
            <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t.subtotal}</dt>
                    <dd className="tabular-nums">{formatMoney(subtotal, locale)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t.shipping}</dt>
                    <dd className="tabular-nums">{formatMoney(shippingCost, locale)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t pt-4">
                    <dt className="font-medium">{t.total}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{formatMoney(total, locale)}</dd>
                </div>
            </dl>
        </section>
    )
}
