import type { OrderStatus, PaymentStatus } from "@repo/database"
import { ORDER_STATUS_COPY, PAYMENT_STATUS_COPY, type StatusTone } from "@repo/database/status"
import type { Locale } from "@repo/database/locale"

import { cn } from "@/lib/utils"

/**
 * THE storefront status badge.
 *
 * Its counterpart is `apps/admin/components/status-badge.tsx`, and the relationship between
 * them is the relationship this whole alignment is about: the WORDS come from one place
 * (`@repo/database/status`), the PRESENTATION is each application's own.
 *
 * Concretely, a storefront badge differs from an operator's in three ways, and all three are
 * about audience rather than taste:
 *
 *   IT IS BIGGER. 12px on a 44px touch row, not 11px on a 34px table row.
 *   IT IS BILINGUAL. It takes a locale and reads the Arabic label from the same record, so an
 *   Arabic order page cannot fall back to an English status the way the hand-written map it
 *   replaces did for `cancelled`.
 *   ITS TONE IS THE CUSTOMER'S. `cancelled` is danger here and neutral in the panel — bad news
 *   to the person who ordered, merely closed to the person who processes orders.
 *
 * A server component: no hooks, no "use client". It renders inside server-rendered order
 * pages, which is all of them.
 *
 * The label is ALWAYS rendered. Colour is never the only signal — the same accessibility rule
 * the admin states, for the same reason.
 */

const TONE_CLASS: Record<StatusTone, string> = {
    neutral: "text-neutral bg-neutral-bg border-neutral-border",
    info: "text-info bg-info-bg border-info-border",
    success: "text-success bg-success-bg border-success-border",
    warning: "text-warning bg-warning-bg border-warning-border",
    danger: "text-danger bg-danger-bg border-danger-border",
}

interface BaseProps extends React.ComponentProps<"span"> {
    locale: Locale
    /** Larger, for a record header where the status is the headline fact. */
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

/**
 * The one-sentence explanation that goes with a status.
 *
 * Separate from the badge because it belongs in a different place on the page — the badge sits
 * beside the order number, the sentence sits under it — and because a badge repeated down a
 * list must not repeat the sentence eight times.
 */
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
