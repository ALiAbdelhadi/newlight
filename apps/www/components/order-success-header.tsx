"use client"

import { CheckCircle2 } from "lucide-react"

interface OrderSuccessHeaderProps {
    orderNumber: string
    translations: {
        orderConfirmed: string
        thankYou: string
        orderNumber: string
    }
}

export function OrderSuccessHeader({ orderNumber, translations: t }: OrderSuccessHeaderProps) {
    return (
        <div className="text-center mb-12">
            <div className="mb-6 inline-grid size-16 place-items-center rounded-full bg-success-bg text-success">
                <CheckCircle2 aria-hidden className="size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-4">
                {t.orderConfirmed}
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
                {t.thankYou}
            </p>
            <p className="text-sm text-muted-foreground">
                {t.orderNumber}: <span className="font-mono font-medium text-foreground">{orderNumber}</span>
            </p>
        </div>
    )
}
