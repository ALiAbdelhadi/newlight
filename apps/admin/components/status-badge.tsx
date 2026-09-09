import { cn } from "@/lib/utils"
import { statusEntry, type StatusKind, type StatusValue, type StatusVariant } from "@/lib/status"

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
    showIcon?: boolean
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
