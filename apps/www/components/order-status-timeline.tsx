"use client"

import { CheckCircle2, Package, ArrowRight } from "lucide-react"

interface OrderStatusTimelineProps {
    createdAt: Date
    locale: string
    translations: {
        orderPlaced: string
        processing: string
        estimatedDelivery: string
    }
}

export function OrderStatusTimeline({ createdAt, locale, translations: t }: OrderStatusTimelineProps) {
    return (
        <div className="bg-secondary/30 rounded-lg p-6 border border-border mb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="font-medium">{t.orderPlaced}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(createdAt).toLocaleDateString(locale, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground rtl:-rotate-180 " />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-medium">{t.processing}</p>
                        <p className="text-xs text-muted-foreground">{t.estimatedDelivery}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
