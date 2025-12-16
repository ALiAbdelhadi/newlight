"use client"

import { OrderSummaryProps } from "@/types"
import Image from "next/image"

export function OrderSummary({
    product,
    productName,
    configuration,
    translations: t
}: OrderSummaryProps) {
    return (
        <div className="bg-secondary/30 rounded-lg p-6 border border-border sticky top-24">
            <h2 className="text-xl font-serif font-light mb-4">
                {t.orderSummary}
            </h2>
            <div className="flex gap-4 mb-6">
                <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                    {product.images.length > 0 ? (
                        <Image
                            src={product.images[0]}
                            alt={productName}
                            fill
                            className="object-cover"
                        />
                    ) : null}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium mb-1">{productName}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t.quantity}: {configuration.quantity}
                    </p>
                </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span>
                        {configuration.totalPrice.toLocaleString()} {t.currency}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.shipping}</span>
                    <span>{t.calculatedAtCheckout}</span>
                </div>
            </div>
        </div>
    )
}