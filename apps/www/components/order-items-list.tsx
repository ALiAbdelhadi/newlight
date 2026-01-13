"use client"

import Image from "next/image"
import { Package } from "lucide-react"
import { OrderItem } from "@repo/database"


interface OrderItemsListProps {
    items: OrderItem[]
    isArabic: boolean
    translations: {
        orderItems: string
        colorTemp: string
        color: string
        quantity: string
        each: string
        currency: string
    }
}

export function OrderItemsList({ items, isArabic, translations: t }: OrderItemsListProps) {
    const formatColorTemp = (temp: string) => {
        const map: Record<string, string> = {
            WARM_3000K: isArabic ? "دافئ 3000K" : "Warm 3000K",
            COOL_4000K: isArabic ? "بارد 4000K" : "Cool 4000K",
            WHITE_6500K: isArabic ? "أبيض 6500K" : "White 6500K",
        }
        return map[temp] || temp
    }

    return (
        <div className="rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-6">
                <Package className="w-5 h-5" />
                <h2 className="text-2xl font-serif font-light">{t.orderItems}</h2>
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                        <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                            {item.productImage && (
                                <Image
                                    src={item.productImage}
                                    alt={item.productName}
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium mb-2">{item.productName}</h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                                {item.selectedColorTemp && (
                                    <p>{t.colorTemp}: {formatColorTemp(item.selectedColorTemp)}</p>
                                )}
                                {item.selectedColor && (
                                    <p>{t.color}: {item.selectedColor}</p>
                                )}
                                <p>{t.quantity}: {item.quantity}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-medium">{item.price.toLocaleString()} {t.currency}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
