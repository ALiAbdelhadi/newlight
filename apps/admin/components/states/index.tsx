"use client"

import type { LucideIcon } from "lucide-react"
import { AlertCircle, Inbox, Lock, RefreshCw, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The global state system (P4.5 §19).
 *
 * Five states, defined once. The reason they live together in one file rather than being
 * written inline per surface is that the DISTINCTIONS are the whole point, and a distinction
 * only survives if there is one place to look it up.
 *
 * The distinction that gets lost most often is empty-vs-no-results, so it is not optional
 * here: `EmptyState` has no default variant, and the caller must say which one it means.
 * "No products yet" and "No products match these filters" call for opposite actions — create
 * one, or clear the filters — and a surface that renders the first when it means the second
 * sends an operator to add a product they already have.
 */

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
    /**
     * `no-data` — the collection is genuinely empty.
     * `no-results` — there is data, but the current filters exclude all of it.
     * No default: choosing between them is the caller's job, and getting it wrong sends the
     * operator to the wrong action.
     */
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

/**
 * `onRetry` must actually re-run the failed request. A "Retry" that calls
 * `location.reload()` is a page refresh wearing a retry's clothes: it throws away every
 * other piece of state on the screen to re-attempt one query.
 */
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

/**
 * Names the role required and nothing else.
 *
 * It deliberately does not say what is behind the wall — "You need SUPER_ADMIN to see the
 * other administrators' email addresses" tells someone without access that those addresses
 * exist and where. The restriction is explained; the data is not described.
 */
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

/**
 * Concurrency, treated as the operational outcome it is (§19).
 *
 * Two people editing one product is normal in a warehouse, not an exception. The rule this
 * enforces is that the newer version is never silently overwritten: the operator is told,
 * and chooses.
 */
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
