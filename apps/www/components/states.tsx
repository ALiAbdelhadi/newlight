import type { LucideIcon } from "lucide-react"
import { AlertCircle, Info, PackageOpen, SearchX } from "lucide-react"

import { cn } from "@/lib/utils"

interface ShellProps {
    icon: LucideIcon
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    tone?: "neutral" | "danger"
    className?: string
}

function StateShell({ icon: Icon, title, description, action, tone = "neutral", className }: ShellProps) {
    return (
        <div
            role="status"
            className={cn(
                "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center lg:py-24",
                className
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "grid size-12 place-items-center rounded-full border",
                    tone === "danger" ? "border-danger-border bg-danger-bg" : "border-border bg-surface-sunk"
                )}
            >
                <Icon className={cn("size-5", tone === "danger" ? "text-danger" : "text-muted-foreground")} />
            </span>

            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            {description && (
                <p className="max-w-[52ch] text-base text-pretty text-muted-foreground">{description}</p>
            )}
            {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
        </div>
    )
}

export interface EmptyStateProps {
    variant: "no-data" | "no-results"
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function EmptyState({ variant, title, description, action, className }: EmptyStateProps) {
    return (
        <StateShell
            icon={variant === "no-results" ? SearchX : PackageOpen}
            title={title}
            description={description}
            action={action}
            className={className}
        />
    )
}

export function ErrorState({
    title,
    description,
    action,
    reference,
    className,
}: {
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    reference?: string
    className?: string
}) {
    return (
        <StateShell
            icon={AlertCircle}
            tone="danger"
            title={title}
            description={
                <>
                    {description}
                    {reference && (
                        <span className="mt-3 block text-sm text-muted-foreground">
                            <span className="font-mono">{reference}</span>
                        </span>
                    )}
                </>
            }
            action={action}
            className={className}
        />
    )
}

export function Notice({
    tone = "info",
    title,
    children,
    action,
    className,
}: {
    tone?: "info" | "warning" | "danger" | "success"
    title?: string
    children?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    const TONE = {
        info: { icon: Info, surface: "border-info-border bg-info-bg", accent: "text-info" },
        warning: { icon: AlertCircle, surface: "border-warning-border bg-warning-bg", accent: "text-warning" },
        danger: { icon: AlertCircle, surface: "border-danger-border bg-danger-bg", accent: "text-danger" },
        success: { icon: Info, surface: "border-success-border bg-success-bg", accent: "text-success" },
    }[tone]

    const Icon = TONE.icon

    return (
        <div
            role={tone === "danger" || tone === "warning" ? "alert" : "status"}
            className={cn("flex gap-3 rounded-lg border p-4", TONE.surface, className)}
        >
            <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", TONE.accent)} />
            <div className="min-w-0 flex-1">
                {title && <p className={cn("font-medium", TONE.accent)}>{title}</p>}
                {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
                {action && <div className="mt-3">{action}</div>}
            </div>
        </div>
    )
}
