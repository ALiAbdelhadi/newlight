"use client"

import type { LucideIcon } from "lucide-react"
import { AlertCircle, Inbox, Lock, RefreshCw, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StateShellProps {
    icon: LucideIcon
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
    tone?: "neutral" | "danger"
}

function StateShell({ icon: Icon, title, description, action, className, tone = "neutral" }: StateShellProps) {
    return (
        <div
            role="status"
            className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}
        >
            <Icon
                aria-hidden
                className={cn("size-5", tone === "danger" ? "text-danger" : "text-muted-foreground")}
            />
            <p className="text-sm font-medium">{title}</p>
            {description && <p className="max-w-[46ch] text-xs text-muted-foreground">{description}</p>}
            {action && <div className="mt-1">{action}</div>}
        </div>
    )
}

export interface EmptyStateProps {
    variant: "no-data" | "no-results"
    title: string
    description?: string
    action?: React.ReactNode
}

export function EmptyState({ variant, title, description, action }: EmptyStateProps) {
    return (
        <StateShell
            icon={variant === "no-results" ? SearchX : Inbox}
            title={title}
            description={description}
            action={action}
        />
    )
}

export function ErrorState({
    title = "That did not load",
    description,
    onRetry,
}: {
    title?: string
    description?: string
    onRetry?: () => void
}) {
    return (
        <StateShell
            icon={AlertCircle}
            tone="danger"
            title={title}
            description={description}
            action={
                onRetry ? (
                    <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
                        <RefreshCw aria-hidden className="mr-1.5 size-3" />
                        Try again
                    </Button>
                ) : undefined
            }
        />
    )
}

export function PermissionDenied({ requiredRole }: { requiredRole?: string }) {
    return (
        <StateShell
            icon={Lock}
            title="You do not have access to this"
            description={
                requiredRole
                    ? `This area is limited to ${requiredRole}. Ask an administrator with that role if you need it.`
                    : "Ask an administrator if you need access to this area."
            }
        />
    )
}

export function StaleNotice({
    entity = "record",
    onReload,
}: {
    entity?: string
    onReload?: () => void
}) {
    return (
        <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-warning-border bg-warning-bg px-4 py-2 text-xs"
        >
            <AlertCircle aria-hidden className="size-3.5 shrink-0 text-warning" />
            <span className="text-warning">
                This {entity} was changed by another user. Review the latest version before saving.
            </span>
            {onReload && (
                <Button size="sm" variant="outline" onClick={onReload} className="ml-auto h-6 text-xs">
                    Load latest
                </Button>
            )}
        </div>
    )
}
