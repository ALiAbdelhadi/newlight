"use client"

import { CreditCard } from "lucide-react"

interface OrderPaymentSummaryProps {
    subtotal: number
    shippingCost: number
    total: number
    translations: {
        paymentSummary: string
        subtotal: string
        shipping: string
        total: string
        currency: string
    }
}

export function OrderPaymentSummary({
    subtotal,
    shippingCost,
    total,
    translations: t
}: OrderPaymentSummaryProps) {
    return (
        <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-2xl font-serif font-light">{t.paymentSummary}</h2>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span>{subtotal.toLocaleString()} {t.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.shipping}</span>
                    <span>{shippingCost.toLocaleString()} {t.currency}</span>
                </div>
                <div className="flex justify-between items-baseline pt-4 border-t border-border">
                    <span className="text-lg font-light uppercase tracking-wide">{t.total}</span>
                    <span className="text-3xl font-serif font-light">
                        {total.toLocaleString()} {t.currency}
                    </span>
                </div>
            </div>
        </div>
    )
}
