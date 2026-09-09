import type { LucideIcon } from "lucide-react"
import { AlertCircle, Info, PackageOpen, SearchX } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The storefront's state system.
 *
 * The admin has had one since P4.5 (`apps/admin/components/states`); the storefront had none,
 * and it showed. Its empty states were sentences typed inline at the point of failure —
 * "No orders found", "No products", a bare `<p>` centred in a grid — and its error path was
 * whatever Next renders when a page throws.
 *
 * The distinction that matters most, and the one the admin's version exists to protect, is
 * EMPTY versus NO RESULTS. "You have not ordered anything yet" and "no orders match this
 * filter" call for opposite actions — go and shop, or clear the filter — and a surface that
 * shows the first when it means the second sends a returning customer to the catalogue to buy
 * something they already bought. `variant` therefore has no default; the caller must say which
 * one it means.
 *
 * The storefront's version is bigger and warmer than the panel's: this is somebody who has hit
 * a dead end while trying to spend money, not an operator reading a filtered table.
 */

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
    /**
     * `no-data`    — this collection is genuinely empty for this person.
     * `no-results` — there is data, but the current filter or search excludes all of it.
     * No default: choosing between them is the caller's job.
     */
    variant: "no-data" | "no-results"
    title: string
    description?: React.ReactNode
    /** The next step, and there should almost always be one. */
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

/**
 * Something failed.
 *
 * It says what the customer can do and nothing about why it broke. §31: no stack traces, no
 * table names, no internal ids. The diagnostics go to the logger, where a developer can read
 * them; a `reference` is accepted so a support conversation has something to quote, because a
 * digest is the one internal string that is useful to a customer.
 */
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

/**
 * A persistent condition stated in place — an order that can no longer be cancelled, a product
 * that is out of stock, a delivery estimate that has moved.
 *
 * A toast cannot do this job: it is gone in four seconds and it is gone on reload, and a
 * customer who refreshes the page must still be told. Same reasoning as the panel's
 * `InlineAlert`, same four tones, same tokens.
 */
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
            /* `alert` interrupts a screen reader. Interrupting somebody to tell them a thing
               succeeded is worse manners than saying nothing, so only the two tones that mean
               something is wrong take it. */
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
