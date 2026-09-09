import type { OrderStatus } from "@repo/database"
import { ORDER_LADDER, ORDER_STATUS_COPY, orderLadderIndex, type OrderLadderStep } from "@repo/database/status"
import type { Locale } from "@repo/database/locale"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

const STEP_DATE: Record<OrderLadderStep, "createdAt" | "shippedAt" | "deliveredAt"> = {
    awaiting_shipment: "createdAt",
    shipped: "shippedAt",
    delivered: "deliveredAt",
}

export interface OrderProgressProps {
    status: OrderStatus
    createdAt: Date | string
    shippedAt: Date | string | null
    deliveredAt: Date | string | null
    locale: Locale
    className?: string
}

export function OrderProgress({
    status,
    createdAt,
    shippedAt,
    deliveredAt,
    locale,
    className,
}: OrderProgressProps) {
    const reached = orderLadderIndex(status)
    const dates = { createdAt, shippedAt, deliveredAt }

    if (reached === null) {
        return (
            <div
                className={cn(
                    "flex items-center gap-3 rounded-lg border border-danger-border bg-danger-bg p-4",
                    className
                )}
            >
                <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-danger-border"
                >
                    <X className="size-4 text-danger" />
                </span>
                <div className="min-w-0">
                    <p className="font-medium text-danger">{ORDER_STATUS_COPY[status].label[locale]}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {ORDER_STATUS_COPY[status].description[locale]}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <ol className={cn("grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3", className)}>
            {ORDER_LADDER.map((step, index) => {
                const done = index <= reached
                const current = index === reached
                const raw = dates[STEP_DATE[step]]
                const at = raw ? new Date(raw) : null

                return (
                    <li
                        key={step}
                        aria-current={current ? "step" : undefined}
                        className={cn(
                            "flex items-center gap-3 bg-card p-4",
                            current && "bg-primary-soft"
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-medium",
                                done
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border-strong text-muted-foreground"
                            )}
                        >
                            {done ? <Check className="size-4" /> : index + 1}
                        </span>

                        <div className="min-w-0">
                            <p className={cn("font-medium", !done && "text-muted-foreground")}>
                                {ORDER_STATUS_COPY[step].label[locale]}
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {at ? (
                                    <time dateTime={at.toISOString()}>
                                        {at.toLocaleDateString(locale, {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </time>
                                ) : (
                                    "—"
                                )}
                            </p>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}
