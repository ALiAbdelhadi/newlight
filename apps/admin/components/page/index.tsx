import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * THE page primitives (P4.5 §8, §22).
 *
 * The shell, the table, the record layout and the state system all landed already. What was
 * missing was the layer between them: the surface every non-list, non-record screen is built
 * from. Sixteen pages had filled that gap individually, and they had all reached the same
 * approximate shape by copying each other —
 *
 *     <div className="flex flex-col min-h-screen pb-10">
 *       <DashboardHeader Route="Shipping" />
 *       <div className="mt-8"><Container>
 *         <div className="bg-card rounded-lg border p-4 shadow-sm">
 *           <p className="text-sm text-muted-foreground mb-1">Awaiting shipment</p>
 *           <p className="text-2xl font-bold tabular-nums">12</p>
 *
 * — which is a system in the sense that everybody guessed the same numbers, not in the sense
 * that anybody could change them. Four things in that snippet are already decided elsewhere
 * and were being re-decided here: the page's padding (§3.2), whether a surface carries a
 * shadow (§3.5 says no — shadows are for things that float), how large a figure is set, and
 * what "this number is bad" looks like (`text-red-600`, a literal no token can reach and
 * which does not move in dark mode).
 *
 * Everything here is a server component. No hooks, no "use client" — most admin pages are
 * server-rendered and a client boundary around a heading is a bundle for nothing.
 *
 * TYPE SCALE, settled once so it stops being re-argued per screen:
 *
 *     22px  full-screen states only — error boundary, sign-in, unauthorized
 *     18px  a record's own identity (RecordLayout)
 *     16px  a page title, and a section heading inside a page
 *     13px  everything else
 *
 * A list page's title is deliberately not larger than the record it opens into. The top bar's
 * breadcrumb already answers "where am I"; the page header answers "what is this and what can
 * I do to it", and the answer to the second question is the action row, not the type size.
 */

/* ------------------------------------------------------------------ header */

export interface PageHeaderProps {
    /** Small label above the title — the domain, an environment, a scope. Rarely needed. */
    eyebrow?: string
    title: string
    /** One sentence. What the surface is for, or the rule that governs it. */
    description?: React.ReactNode
    /** A StatusBadge or similar readout that qualifies the whole page. */
    status?: React.ReactNode
    /** Primary and secondary actions, right-aligned. Primary last, nearest the edge. */
    actions?: React.ReactNode
    /** A tab strip owned by the page. Renders flush with the header's bottom rule. */
    tabs?: React.ReactNode
    className?: string
}

/**
 * The page's masthead.
 *
 * Full-bleed with its own bottom rule rather than a floating card, so it reads as part of the
 * shell's chrome and the content beneath it starts at a predictable line. Every element is
 * optional except the title — a page with nothing to say beyond its name renders one line and
 * 33px, not an empty band.
 */
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

/* ------------------------------------------------------------------- body */

/**
 * The page's content box — §3.2's padding, and nothing else.
 *
 * Full bleed: this replaces `mx-auto max-w-7xl`, which capped every table at 1280px and gave
 * an operator on a 2560px monitor 1280px of margin instead of the columns they paid for in
 * screen real estate. Forms and prose do not want full bleed either, and that is what
 * `ProseColumn` is for.
 */
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

/**
 * A measured column for reading and for forms. 720px ≈ 90 characters at 13px — past the
 * comfortable limit for running text, right for a labelled form where label and control share
 * a line. Tables never use it.
 */
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

/**
 * Vertical rhythm between sections, in one place.
 *
 * `space-y-8` on one page and `mb-10` on the next is the kind of drift nobody reports and
 * everybody feels. §3.2 fixes the gap at 20px; a page stacks its sections in this and stops
 * choosing.
 */
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

/* ---------------------------------------------------------------- section */

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    title?: string
    description?: React.ReactNode
    /** Actions belonging to this section, not to the page. */
    actions?: React.ReactNode
    /** Renders the body inside a framed surface. Off for sections that own their own frame. */
    framed?: boolean
}

/**
 * A titled region of a page.
 *
 * The heading is `h2` because `PageHeader` owns the `h1` — sixteen pages were emitting a bare
 * `<h2 className="font-semibold text-lg mb-1">` under a heading that did not exist, and a
 * screen reader's heading list came out as a flat pile of h2s with no page name above them.
 */
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

/* ---------------------------------------------------------------- surface */

/**
 * A framed surface — the one card in the system.
 *
 * No shadow (§3.5: shadows are reserved for things that float above the page), 6px radius
 * (§3.4), and 12px of padding by default. The hand-written form of this — card background,
 * 10px radius, 16px padding and `shadow-sm` — appeared thirty-one times across the panel,
 * carrying the shadow the token file explicitly forbids: the rule was documented, and
 * violated everywhere it was applied by hand.
 *
 * `padded={false}` for a surface whose child manages its own edges — a table, a list.
 */
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

/**
 * The frame around a server-rendered table.
 *
 * `DataTable` is the answer for any list an operator sorts, filters or pages. This is for the
 * ones that are genuinely a readout — the low-stock list, the fulfilment queue — where the
 * whole result set is the point and there is nothing to page through. It gives them the same
 * edges and the same horizontal-scroll behaviour so they do not read as a different kind of
 * object.
 */
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

/* ------------------------------------------------------------------- stat */

export type StatTone = "default" | "warning" | "danger" | "success"

const STAT_TONE: Record<StatTone, string> = {
    default: "text-foreground",
    warning: "text-warning",
    danger: "text-danger",
    success: "text-success",
}

export interface StatProps {
    label: string
    /**
     * The figure. A `string` so the caller formats it — money is a Decimal and must never
     * reach a component as a number (ADR 0001).
     */
    value?: React.ReactNode
    /**
     * Why there is no value. Rendered INSTEAD of the figure, never as a zero: "no stocktake
     * has been done" and "the stock is worth nothing" are different claims and only one of
     * them is true.
     */
    unavailable?: string
    /** A qualifier under the figure — the period, the comparison, the threshold. */
    hint?: string
    tone?: StatTone
    /** Makes the whole tile a link to the surface that acts on it. */
    href?: string
}

/**
 * One figure, framed.
 *
 * 18px, not 22px. A KPI set at 22px on a screen whose largest heading is 16px inverts the
 * hierarchy of the page it sits on: the number shouts and the thing it describes whispers.
 * Tone is semantic and comes from tokens, so "bad" survives dark mode — `text-danger`
 * did not.
 */
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

/**
 * The row a `Stat` set lives in. Two up on a phone, four up from `md`; a fifth or sixth tile
 * wraps rather than shrinking below a readable width.
 */
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

/* ------------------------------------------------------------------ alert */

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
    /** A control that resolves the condition — start the stocktake, add the address. */
    action?: React.ReactNode
    className?: string
}

/**
 * A persistent condition, stated where it applies.
 *
 * §19's rule is that a toast is for an action that completed, not for a state that persists —
 * an operator who reloads the page must still be told that the opening count is pending. This
 * is that channel. It was being hand-rolled per page as
 * `border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/10`, which is a literal amber that no
 * token reaches, a `dark:` utility of the kind §3 forbids, and an unnamed severity.
 *
 * `role="status"` for the informational tones and `role="alert"` for the two that mean
 * something is wrong: an alert interrupts a screen reader, and interrupting somebody to tell
 * them a thing succeeded is worse manners than saying nothing.
 */
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

/* --------------------------------------------------------------- metadata */

export interface MetadataItem {
    label: string
    value: React.ReactNode
    /** Identifiers, SKUs, tracking numbers — anything an operator compares character by character. */
    mono?: boolean
}

/**
 * Label/value pairs, as a real `<dl>`.
 *
 * `direction="row"` for a header strip, `"column"` for a rail or a detail panel. The reason
 * this exists rather than each detail page laying out its own grid is that the pairs then
 * align across screens: an operator finds "Created" in the same relative place on an order as
 * on a customer.
 */
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

/* ------------------------------------------------------------------- tabs */

/**
 * Tab styling, as classes rather than as components.
 *
 * Radix's Tabs are client components and these primitives are not, so wrapping them here
 * would drag a client boundary into every server page that imports anything from this file.
 * Two exported strings do the same job with no runtime.
 *
 * An underline, not a filled pill. A pill row reads as a set of buttons — things you press to
 * make something happen; an underline reads as a position within one thing, which is what a
 * tab is. `RecordLayout` already made that choice and had it written inline; page-level tabs
 * were shadcn's default pill row, so the two disagreed on the same screen.
 */
export const pageTabsListClass =
    "h-8 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"

export const pageTabsTriggerClass = [
    "h-8 gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-2.5 text-xs",
    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
    "data-[state=active]:font-medium data-[state=active]:text-foreground",
    "data-[state=active]:shadow-none",
].join(" ")
