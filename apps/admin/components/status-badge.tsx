import { cn } from "@/lib/utils"
import { statusEntry, type StatusKind, type StatusValue, type StatusVariant } from "@/lib/status"

/**
 * THE status badge (P4.5 §14).
 *
 * A page names a vocabulary and a value; it never picks a colour. That is the whole
 * contract, and it is what stops the twelfth list surface inventing a thirteenth shade of
 * amber.
 *
 * Not built on components/ui/badge.tsx on purpose. That one is `rounded-full` with a
 * `focus-visible` ring and four brand variants — a pill for marketing chips. A status in a
 * 34px row wants a 4px corner, a 5-variant semantic palette, and no interactive affordance,
 * because a status is a readout, not a control.
 *
 * Deliberately a server component: no hooks, no "use client". It renders inside server-
 * rendered tables, which is most of them.
 */

const VARIANT_CLASS: Record<StatusVariant, string> = {
    neutral: "text-neutral bg-neutral-bg border-neutral-border",
    info: "text-info bg-info-bg border-info-border",
    success: "text-success bg-success-bg border-success-border",
    warning: "text-warning bg-warning-bg border-warning-border",
    danger: "text-danger bg-danger-bg border-danger-border",
}

interface StatusBadgeProps<K extends StatusKind> extends React.ComponentProps<"span"> {
    kind: K
    value: StatusValue<K> | string
    /**
     * Render the entry's icon, where it has one. Off by default: an icon on every row of a
     * dense table is decoration, and the label already carries the meaning (§1.5).
     */
    showIcon?: boolean
    /**
     * Extra text after the label — "Reserved 4", "Low 6". Kept outside `label` so the
     * vocabulary stays a fixed set of strings that an export or a filter can match on.
     */
    detail?: string | number
}

export function StatusBadge<K extends StatusKind>({
    kind,
    value,
    showIcon = false,
    detail,
    className,
    ...props
}: StatusBadgeProps<K>) {
    const entry = statusEntry(kind, value)
    const Icon = entry.icon

    return (
        <span
            data-slot="status-badge"
            data-status={String(value)}
            data-variant={entry.variant}
            /*
             * `title` rather than a Tooltip: this renders inside table cells by the hundred,
             * and mounting a Radix tooltip per row would cost more than the description is
             * worth. Surfaces that show ONE status — a record header — can wrap it in a real
             * Tooltip themselves.
             */
            title={entry.description}
            className={cn(
                "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border",
                "px-1.5 py-0.5 text-2xs leading-none font-medium",
                VARIANT_CLASS[entry.variant],
                className
            )}
            {...props}
        >
            {showIcon && Icon ? <Icon aria-hidden className="size-3 shrink-0" /> : null}
            {entry.label}
            {detail !== undefined && detail !== null && detail !== "" ? (
                <span className="font-normal tabular-nums opacity-80">{detail}</span>
            ) : null}
        </span>
    )
}
