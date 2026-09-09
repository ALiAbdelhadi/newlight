import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps {
    eyebrow?: string
    title: string
    description?: React.ReactNode
    status?: React.ReactNode
    actions?: React.ReactNode
    tabs?: React.ReactNode
    className?: string
}

export function PageHeader({
    eyebrow,
    title,
    description,
    status,
    actions,
    tabs,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn("shrink-0 border-b bg-card px-4 pt-3", tabs ? "pb-0" : "pb-3", className)}>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                    {eyebrow && (
                        <p className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                            {eyebrow}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
                        {status}
                    </div>
                    {description && (
                        <p className="mt-0.5 max-w-[80ch] text-xs text-muted-foreground">{description}</p>
                    )}
                </div>

                {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
            </div>

            {tabs && <div className="mt-2">{tabs}</div>}
        </header>
    )
}

export function PageBody({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full px-4 pt-3 pb-6", className)} {...props}>
            {children}
        </div>
    )
}

export function ProseColumn({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("w-full max-w-[720px]", className)} {...props}>
            {children}
        </div>
    )
}

export function PageStack({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col gap-5", className)} {...props}>
            {children}
        </div>
    )
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    title?: string
    description?: React.ReactNode
    actions?: React.ReactNode
    framed?: boolean
}

export function Section({
    title,
    description,
    actions,
    framed = false,
    children,
    className,
    ...props
}: SectionProps) {
    return (
        <section className={cn("min-w-0", className)} {...props}>
            {(title || actions) && (
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                        {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
                        {description && (
                            <p className="mt-0.5 max-w-[80ch] text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
                </div>
            )}
            {framed ? <Panel>{children}</Panel> : children}
        </section>
    )
}

export function Panel({
    padded = true,
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
    return (
        <div
            className={cn("rounded-lg border bg-card", padded && "p-3", className)}
            {...props}
        >
            {children}
        </div>
    )
}

export function TableFrame({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("overflow-x-auto rounded-lg border bg-card", className)} {...props}>
            {children}
        </div>
    )
}

export type StatTone = "default" | "warning" | "danger" | "success"

const STAT_TONE: Record<StatTone, string> = {
    default: "text-foreground",
    warning: "text-warning",
    danger: "text-danger",
    success: "text-success",
}

export interface StatProps {
    label: string
    value?: React.ReactNode
    unavailable?: string
    hint?: string
    tone?: StatTone
    href?: string
}

export function Stat({ label, value, unavailable, hint, tone = "default", href }: StatProps) {
    const body = (
        <>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            {unavailable ? (
                <p className="mt-1 text-xs text-muted-foreground italic">{unavailable}</p>
            ) : (
                <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", STAT_TONE[tone])}>{value}</p>
            )}
            {hint && <p className="mt-0.5 truncate text-2xs text-muted-foreground">{hint}</p>}
        </>
    )

    if (href) {
        return (
            <a
                href={href}
                className="rounded-lg border bg-card p-3 transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-accent/40"
            >
                {body}
            </a>
        )
    }

    return <div className="rounded-lg border bg-card p-3">{body}</div>
}

export function StatGrid({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("grid grid-cols-2 gap-2 md:grid-cols-4", className)} {...props}>
            {children}
        </div>
    )
}

export type AlertTone = "info" | "warning" | "danger" | "success"

const ALERT_TONE: Record<AlertTone, { icon: LucideIcon; className: string; accent: string }> = {
    info: { icon: Info, className: "border-info-border bg-info-bg", accent: "text-info" },
    warning: { icon: AlertTriangle, className: "border-warning-border bg-warning-bg", accent: "text-warning" },
    danger: { icon: OctagonAlert, className: "border-danger-border bg-danger-bg", accent: "text-danger" },
    success: { icon: CheckCircle2, className: "border-success-border bg-success-bg", accent: "text-success" },
}

export interface InlineAlertProps {
    tone?: AlertTone
    title?: string
    children?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function InlineAlert({ tone = "info", title, children, action, className }: InlineAlertProps) {
    const { icon: Icon, className: toneClass, accent } = ALERT_TONE[tone]

    return (
        <div
            role={tone === "danger" || tone === "warning" ? "alert" : "status"}
            className={cn("flex gap-2.5 rounded-lg border p-3", toneClass, className)}
        >
            <Icon aria-hidden className={cn("mt-px size-4 shrink-0", accent)} />
            <div className="min-w-0 flex-1">
                {title && <p className={cn("text-sm font-medium", accent)}>{title}</p>}
                {children && <div className="mt-0.5 text-xs text-muted-foreground">{children}</div>}
                {action && <div className="mt-2">{action}</div>}
            </div>
        </div>
    )
}

export interface MetadataItem {
    label: string
    value: React.ReactNode
    mono?: boolean
}

export function MetadataList({
    items,
    direction = "column",
    className,
}: {
    items: MetadataItem[]
    direction?: "row" | "column"
    className?: string
}) {
    return (
        <dl
            className={cn(
                direction === "row"
                    ? "flex flex-wrap items-center gap-x-5 gap-y-1.5"
                    : "grid gap-1.5",
                "text-xs",
                className
            )}
        >
            {items.map((item) => (
                <div
                    key={item.label}
                    className={cn(
                        direction === "row"
                            ? "flex items-baseline gap-1.5"
                            : "flex items-baseline justify-between gap-3"
                    )}
                >
                    <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
                    <dd className={cn("min-w-0 text-right", item.mono && "font-mono text-2xs")}>
                        {item.value}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

export const pageTabsListClass =
    "h-8 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"

export const pageTabsTriggerClass = [
    "h-8 gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-2.5 text-xs",
    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
    "data-[state=active]:font-medium data-[state=active]:text-foreground",
    "data-[state=active]:shadow-none",
].join(" ")
