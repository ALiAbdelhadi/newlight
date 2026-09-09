import type { OrderStatus, PaymentStatus } from "@repo/database"
import { ORDER_STATUS_COPY, PAYMENT_STATUS_COPY, type StatusTone } from "@repo/database/status"
import type { Locale } from "@repo/database/locale"

import { cn } from "@/lib/utils"

const TONE_CLASS: Record<StatusTone, string> = {
    neutral: "text-neutral bg-neutral-bg border-neutral-border",
    info: "text-info bg-info-bg border-info-border",
    success: "text-success bg-success-bg border-success-border",
    warning: "text-warning bg-warning-bg border-warning-border",
    danger: "text-danger bg-danger-bg border-danger-border",
}

interface BaseProps extends React.ComponentProps<"span"> {
    locale: Locale
    size?: "sm" | "md"
}

type StatusBadgeProps =
    | (BaseProps & { kind: "order"; value: OrderStatus })
    | (BaseProps & { kind: "payment"; value: PaymentStatus })

export function StatusBadge({ kind, value, locale, size = "sm", className, ...props }: StatusBadgeProps) {
    const copy = kind === "order" ? ORDER_STATUS_COPY[value] : PAYMENT_STATUS_COPY[value]

    return (
        <span
            data-slot="status-badge"
            data-status={value}
            data-tone={copy.tone}
            className={cn(
                "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
                size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
                TONE_CLASS[copy.tone],
                className
            )}
            {...props}
        >
            {copy.label[locale]}
        </span>
    )
}

export function statusDescription(
    kind: "order" | "payment",
    value: OrderStatus | PaymentStatus,
    locale: Locale
): string {
    const copy =
        kind === "order"
            ? ORDER_STATUS_COPY[value as OrderStatus]
            : PAYMENT_STATUS_COPY[value as PaymentStatus]
    return copy.description[locale]
}
