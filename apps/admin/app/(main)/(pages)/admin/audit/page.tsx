import Link from "next/link"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuditService } from "@/lib/services/audit-service"
import { AuditFilters } from "./audit-filters"
import { AuditDiff } from "./audit-diff"

/**
 * The audit log, finally readable.
 *
 * Every change this panel makes has been recorded with an actor and a timestamp since P5, and
 * the only way to see any of it was a database client. A log nobody can read proves things
 * after an incident, to whoever has database access — which is not the same as answering
 * "who changed this price".
 */
export const dynamic = "force-dynamic"

/** The entities whose ids lead somewhere. The rest are shown as ids, because they are ids. */
function linkFor(entity: string, entityId: string): string | null {
    switch (entity) {
        case "Product":
            return `/admin/products/${entityId}`
        case "Category":
            return `/admin/taxonomy/category/${entityId}`
        case "SubCategory":
            return `/admin/taxonomy/sub-category/${entityId}`
        case "Order":
            return `/admin/orders/${entityId}`
        case "User":
            return `/admin/users/${entityId}`
        case "SpecDefinition":
            return `/admin/specs`
        default:
            return null
    }
}

export default async function AuditPage({
    searchParams,
}: {
    searchParams: Promise<{ action?: string; entity?: string; actor?: string; q?: string; page?: string }>
}) {
    await requireCurrentAdmin()
    const params = await searchParams

    const [{ rows, total, page, totalPages }, facets, summary] = await Promise.all([
        AuditService.list({
            action: params.action,
            entity: params.entity,
            actorEmail: params.actor,
            search: params.q,
            page: Number(params.page ?? 1) || 1,
        }),
        AuditService.facets(),
        AuditService.summary(),
    ])

    const query = (overrides: Record<string, string | undefined>) => {
        const next = new URLSearchParams()
        const merged = { action: params.action, entity: params.entity, actor: params.actor, q: params.q, ...overrides }
        for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value)
        const s = next.toString()
        return `/admin/audit${s ? `?${s}` : ""}`
    }

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Audit log" />
            <div className="mt-8">
                <Container>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: "Last 24 hours", value: summary.today },
                            { label: "Last 7 days", value: summary.week },
                            { label: "People today", value: summary.actorsToday },
                            { label: "Matching this filter", value: total },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-card rounded-lg border p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <AuditFilters facets={facets} current={params} />

                    <div className="overflow-x-auto border rounded-lg shadow mt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">When</TableHead>
                                    <TableHead>Who</TableHead>
                                    <TableHead>What</TableHead>
                                    <TableHead>To what</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            Nothing matches that filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => {
                                        const href = linkFor(row.entity, row.entityId)
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell className="whitespace-nowrap tabular-nums text-sm align-top">
                                                    {new Date(row.createdAt).toLocaleString("en-GB")}
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="text-sm">{row.actorEmail ?? "—"}</div>
                                                    {row.actorType && row.actorType !== "ADMIN" && (
                                                        <Badge variant="outline" className="mt-1">
                                                            {row.actorType.toLowerCase()}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <Link
                                                        href={query({ action: row.action, page: undefined })}
                                                        className="font-mono text-sm underline underline-offset-4"
                                                    >
                                                        {row.action}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <div className="text-sm">{row.entity}</div>
                                                    {href ? (
                                                        <Link
                                                            href={href}
                                                            className="font-mono text-xs text-muted-foreground underline underline-offset-4 break-all"
                                                        >
                                                            {row.entityId}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-mono text-xs text-muted-foreground break-all">
                                                            {row.entityId}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top max-w-md">
                                                    <AuditDiff diff={row.diff} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <nav className="flex items-center justify-between mt-4" aria-label="Audit log pages">
                            <Button variant="secondary" size="sm" disabled={page <= 1} asChild={page > 1}>
                                {page > 1 ? <Link href={query({ page: String(page - 1) })}>Previous</Link> : <span>Previous</span>}
                            </Button>
                            <span className="text-sm text-muted-foreground tabular-nums">
                                Page {page} of {totalPages}
                            </span>
                            <Button variant="secondary" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                                {page < totalPages ? <Link href={query({ page: String(page + 1) })}>Next</Link> : <span>Next</span>}
                            </Button>
                        </nav>
                    )}
                </Container>
            </div>
        </div>
    )
}
