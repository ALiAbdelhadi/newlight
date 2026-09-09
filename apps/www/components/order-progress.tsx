import type { OrderStatus } from "@repo/database"
import { ORDER_LADDER, ORDER_STATUS_COPY, orderLadderIndex, type OrderLadderStep } from "@repo/database/status"
import type { Locale } from "@repo/database/locale"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Where an order has got to.
 *
 * This replaces `order-status-timeline`, which was a two-step decoration: it drew "Order
 * placed" followed by "Processing" for EVERY order regardless of its actual status, and
 * `processing` is a value migration 0010 removed from the enum — so a delivered order and a
 * cancelled order both rendered as "processing", forever.
 *
 * The steps come from `ORDER_LADDER` in the domain layer, so the storefront cannot show a stage
 * the state machine does not have, and adding one is a change in one file.
 *
 * CANCELLATION IS NOT A STEP. `orderLadderIndex` returns null for it on purpose, which forces
 * this component to handle it rather than be handed a number: rendering cancelled as position
 * 0 of 3 tells a customer their cancelled order is about to be picked, and rendering it as 3 of
 * 3 tells them it was delivered.
 */

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
        // The only status off the ladder is `cancelled`, and it gets a sentence rather than a
        // diagram: there is no progress to draw.
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
                            {/* A date only where one exists. A future step showing an invented
                                estimate is a promise nothing in the system can keep — which is
                                what "Estimated delivery" was. */}
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
