"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Rendering a diff whose shape changes per action.
 *
 * `diff` is arbitrary JSON — every service writes whatever describes its own change. Rather
 * than a switch over twenty-odd action names that would go stale the first time someone adds
 * one, this recognises three SHAPES that recur and falls back to showing the JSON:
 *
 *   { from, to }            a single value moved            150.00 → 175.50
 *   { field: [from, to] }   several values moved            labelEn: "IP Rating" → "Ingress"
 *   { changes: [...] }      a bulk edit, one entry per row  collapsed behind a count
 *
 * The fallback is deliberately the raw JSON and not a friendly summary. A summary that guesses
 * wrong about an unfamiliar shape is worse than the data, because the data is the point.
 */
export function AuditDiff({ diff }: { diff: unknown }) {
    const [open, setOpen] = useState(false)

    if (diff === null || diff === undefined) return <span className="text-muted-foreground">—</span>
    if (typeof diff !== "object") return <span className="font-mono text-xs">{String(diff)}</span>

    const record = diff as Record<string, unknown>

    // A bulk change: show the count, and the rows on demand.
    if (Array.isArray(record.changes)) {
        const changes = record.changes as Array<Record<string, unknown>>
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="rounded border px-1.5 py-0.5 text-2xs tabular-nums text-muted-foreground">
                        {changes.length} change{changes.length === 1 ? "" : "s"}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                        className="h-6 px-1.5 text-xs"
                    >
                        {open ? "Hide" : "Show"}
                    </Button>
                </div>
                {open && (
                    <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-2xs">
                        {changes.map((change, i) => (
                            <li key={i} className="text-muted-foreground">
                                {String(change.sku ?? change.key ?? change.productId ?? i)}:{" "}
                                <span className="line-through">{String(change.from ?? "—")}</span>{" "}
                                → <span className="text-foreground">{String(change.to ?? "—")}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }

    const rows: Array<{ label: string; from?: string; to?: string; value?: string }> = []

    for (const [key, value] of Object.entries(record)) {
        // { field: [from, to] }
        if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v !== "object")) {
            rows.push({ label: key, from: String(value[0]), to: String(value[1]) })
            continue
        }
        if (key === "from" || key === "to") continue
        rows.push({
            label: key,
            value:
                value === null
                    ? "—"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value),
        })
    }

    // { from, to } at the top level.
    if ("from" in record || "to" in record) {
        rows.unshift({ label: "value", from: String(record.from ?? "—"), to: String(record.to ?? "—") })
    }

    return (
        <ul className="space-y-0.5 text-xs">
            {rows.slice(0, open ? rows.length : 4).map((row, i) => (
                <li key={i} className="break-all">
                    <span className="text-muted-foreground">{row.label}:</span>{" "}
                    {row.from !== undefined ? (
                        <>
                            <span className="line-through text-muted-foreground">{row.from}</span>{" "}
                            → <span className="font-medium">{row.to}</span>
                        </>
                    ) : (
                        <span className="font-mono">{row.value}</span>
                    )}
                </li>
            ))}
            {rows.length > 4 && (
                <li>
                    <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={open}
                        className="h-6 px-1 text-xs"
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? "less" : `+${rows.length - 4} more`}
                    </Button>
                </li>
            )}
        </ul>
    )
}
