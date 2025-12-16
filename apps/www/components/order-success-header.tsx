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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
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
