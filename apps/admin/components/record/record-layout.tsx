"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNowStrict } from "date-fns"

import { StatusBadge } from "@/components/status-badge"
import { StaleNotice } from "@/components/states"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { StatusKind, StatusValue } from "@/lib/status"

/**
 * THE record layout (P4.5 §12).
 *
 * Header, tabs, right rail. One shape for Product, Order, Customer and Settings, so an
 * operator who has learned where the status sits on one screen has learned it on all of them.
 *
 * THE RAIL IS NOT OPTIONAL. §1.4 asks six questions the operator must always be able to
 * answer, and three of them — who changed it, when, and can it be undone — have no home
 * anywhere except an audit trail. `AdminAuditLog` already records every change and
 * `@@index([entity, entityId, createdAt])` exists for exactly this read, so the trail was
 * already being written and simply had nowhere to be seen. Deferring the rail would mean
 * shipping a record screen that cannot answer half of §1.4.
 *
 * The active tab lives in the URL, so a link to a product's Inventory panel is a link to
 * that panel and the back button steps between tabs rather than leaving the record.
 */

export interface RecordIdentifier {
    label: string
    value: string
    mono?: boolean
}

export interface RecordTab {
    id: string
    label: string
    /** A count or a warning marker. Absent means no badge. */
    badge?: React.ReactNode
    content: React.ReactNode
}

export interface AuditEntry {
    id: string
    action: string
    actorEmail: string | null
    actorType: string | null
    createdAt: string
}

interface RecordLayoutProps {
    title: string
    /** Rendered under the title — the sub-category path, the customer's email. */
    subtitle?: string
    identifiers?: RecordIdentifier[]
    status?: { kind: StatusKind; value: string }
    /** Secondary marks: Hidden, Featured, Archived. */
    marks?: React.ReactNode
    actions?: React.ReactNode
    tabs: RecordTab[]
    defaultTab?: string
    rail: {
        createdAt: string
        updatedAt: string
        audit: AuditEntry[]
        /** Where the full, filterable log lives for this entity. */
        auditHref?: string
        extra?: React.ReactNode
    }
    /** Set when the record changed underneath the operator (§19). */
    stale?: boolean
    onReload?: () => void
}

export function RecordLayout({
    title,
    subtitle,
    identifiers = [],
    status,
    marks,
    actions,
    tabs,
    defaultTab,
    rail,
    stale = false,
    onReload,
}: RecordLayoutProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const urlTab = searchParams.get("tab")
    const active = tabs.some((tab) => tab.id === urlTab) ? urlTab! : (defaultTab ?? tabs[0]!.id)

    function selectTab(next: string) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", next)
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {stale && <StaleNotice entity="product" onReload={onReload} />}

            <Tabs value={active} onValueChange={selectTab} className="flex min-h-0 flex-1 flex-col gap-0">
                <header className="shrink-0 border-b px-4 pt-3">
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl font-semibold tracking-tight">
                                    <bdi dir="auto">{title}</bdi>
                                </h1>
                                {status && <StatusBadge kind={status.kind} value={status.value as StatusValue<StatusKind>} />}
                                {marks}
                            </div>

                            {subtitle && (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    <bdi dir="auto">{subtitle}</bdi>
                                </p>
                            )}

                            {identifiers.length > 0 && (
                                <dl className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs">
                                    {identifiers.map((identifier) => (
                                        <div key={identifier.label} className="flex items-center gap-1">
                                            <dt className="text-muted-foreground">{identifier.label}</dt>
                                            <dd className={cn(identifier.mono !== false && "font-mono")}>
                                                {identifier.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </div>

                        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
                    </div>

                    <TabsList className="mt-2 h-8 gap-0 bg-transparent p-0">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                /*
                                 * An underline, not a filled pill. A pill row reads as a set
                                 * of buttons; an underline reads as a position within one
                                 * record, which is what a tab is.
                                 */
                                className={cn(
                                    "h-8 gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-2.5 text-xs",
                                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                                    "data-[state=active]:font-medium data-[state=active]:text-foreground",
                                    "data-[state=active]:shadow-none"
                                )}
                            >
                                {tab.label}
                                {tab.badge}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </header>

                <div className="flex min-h-0 flex-1">
                    <div className="min-w-0 flex-1 overflow-y-auto">
                        {tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="mt-0 p-4">
                                {tab.content}
                            </TabsContent>
                        ))}
                    </div>

                    <RecordRail {...rail} />
                </div>
            </Tabs>
        </div>
    )
}

function RecordRail({
    createdAt,
    updatedAt,
    audit,
    auditHref,
    extra,
}: RecordLayoutProps["rail"]) {
    return (
        <aside
            aria-label="Record history"
            className="hidden w-64 shrink-0 overflow-y-auto border-l bg-surface-sunk px-3 py-3 xl:block"
        >
            <dl className="space-y-1.5 text-2xs">
                <RailRow label="Created" value={<Timestamp value={createdAt} />} />
                <RailRow label="Updated" value={<Timestamp value={updatedAt} />} />
            </dl>

            {extra && <div className="mt-3 border-t pt-3">{extra}</div>}

            <div className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Audit trail
                    </h2>
                    {auditHref && (
                        <Link
                            href={auditHref}
                            className="text-2xs text-primary underline-offset-2 hover:underline"
                        >
                            All
                        </Link>
                    )}
                </div>

                {audit.length === 0 ? (
                    /*
                     * "No changes recorded" and not an empty box: for a product migrated in
                     * bulk this is the truth, and an empty area reads like something failed
                     * to load.
                     */
                    <p className="mt-2 text-2xs text-muted-foreground">
                        No changes recorded since this record was created.
                    </p>
                ) : (
                    <ol className="mt-2 space-y-2">
                        {audit.map((entry) => (
                            <li key={entry.id} className="border-l-2 border-border pl-2">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-mono text-2xs">{entry.action}</span>
                                    {entry.actorType && (
                                        <StatusBadge kind="actor" value={entry.actorType} className="shrink-0" />
                                    )}
                                </div>
                                <div className="truncate text-2xs text-muted-foreground">
                                    {entry.actorEmail ?? "system"}
                                </div>
                                <Timestamp value={entry.createdAt} className="text-2xs text-muted-foreground" />
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </aside>
    )
}

function RailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
        </div>
    )
}

/**
 * Relative time, with the exact timestamp on hover.
 *
 * "3 days ago" is what someone scanning a trail actually wants; the absolute time is what
 * they want once something looks wrong. `suppressHydrationWarning` because the server and
 * the client compute "ago" at different instants, and that difference is not a bug worth a
 * console error on every record page.
 */
function Timestamp({ value, className }: { value: string; className?: string }) {
    const date = new Date(value)
    return (
        <time
            dateTime={value}
            title={date.toLocaleString("en-GB")}
            suppressHydrationWarning
            className={cn("tabular-nums", className)}
        >
            {formatDistanceToNowStrict(date, { addSuffix: true })}
        </time>
    )
}
