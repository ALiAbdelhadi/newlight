import Image from "@/components/app-image"
import { Package } from "lucide-react"
import type { OrderItem } from "@repo/database"
import type { Locale } from "@repo/database/locale"

import { formatNumberWithConversion } from "@/lib/price"

const COLOR_TEMP_KELVIN: Record<string, string> = {
    WARM_3000K: "3000K",
    COOL_4000K: "4000K",
    WHITE_6500K: "6500K",
}

interface OrderItemsListProps {
    items: OrderItem[]
    locale: Locale
    translations: {
        orderItems: string
        colorTemp: string
        color: string
        quantity: string
    }
}

export function OrderItemsList({ items, locale, translations: t }: OrderItemsListProps) {
    return (
        <section aria-labelledby="order-items" className="rounded-lg border bg-card p-6">
            <div className="mb-6 flex items-center gap-2">
                <Package aria-hidden className="size-5 text-muted-foreground" />
                <h2 id="order-items" className="text-lg font-semibold tracking-tight">
                    {t.orderItems}
                </h2>
            </div>

            <ul className="divide-y">
                {items.map((item) => (
                    <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-surface-sunk">
                            {item.productImage && (
                                <Image
                                    src={item.productImage}
                                    alt=""
                                    fill
                                    sizes="80px"
                                    className="object-contain"
                                />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="font-medium">
                                <bdi dir="auto">{item.productName}</bdi>
                            </h3>
                            <dl className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                                {item.selectedColorTemp && (
                                    <div className="flex gap-1.5">
                                        <dt>{t.colorTemp}:</dt>
                                        <dd>{COLOR_TEMP_KELVIN[item.selectedColorTemp] ?? item.selectedColorTemp}</dd>
                                    </div>
                                )}
                                {item.selectedColorKey && (
                                    <div className="flex gap-1.5">
                                        <dt>{t.color}:</dt>
                                        <dd>{item.selectedColorKey}</dd>
                                    </div>
                                )}
                                <div className="flex gap-1.5">
                                    <dt>{t.quantity}:</dt>
                                    <dd className="tabular-nums">{item.quantity}</dd>
                                </div>
                            </dl>
                        </div>

                        <p className="shrink-0 font-medium tabular-nums">
                            {formatNumberWithConversion(item.price, locale)}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    )
}
