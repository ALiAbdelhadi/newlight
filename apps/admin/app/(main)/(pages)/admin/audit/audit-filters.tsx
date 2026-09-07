"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Facet {
    value: string
    count: number
}

/**
 * Filters, built from the data.
 *
 * The action list is not hard-coded because actions are formed by template in places —
 * `order.shipped->delivered`, `${kind}.restore` — so any list written by hand would be wrong
 * the first time someone adds a transition. Every option here is a value that actually exists
 * in the log, with how many rows carry it.
 */
export function AuditFilters({
    facets,
    current,
}: {
    facets: { actions: Facet[]; entities: Facet[]; actors: Facet[] }
    current: { action?: string; entity?: string; actor?: string; q?: string }
}) {
    const router = useRouter()

    const go = (overrides: Record<string, string>) => {
        const next = new URLSearchParams()
        const merged = { ...current, ...overrides }
        for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value)
        const s = next.toString()
        router.push(`/admin/audit${s ? `?${s}` : ""}`)
    }

    const filtered = Boolean(current.action || current.entity || current.actor || current.q)

    return (
        <section className="bg-card rounded-lg border p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="q">Search</Label>
                <Input
                    id="q"
                    defaultValue={current.q ?? ""}
                    placeholder="an action, an id, an email"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") go({ q: (e.target as HTMLInputElement).value, page: "" })
                    }}
                />
            </div>

            {(
                [
                    { id: "action", label: "Action", options: facets.actions, value: current.action },
                    { id: "entity", label: "Entity", options: facets.entities, value: current.entity },
                    { id: "actor", label: "Who", options: facets.actors, value: current.actor },
                ] as const
            ).map((select) => (
                <div key={select.id} className="space-y-1.5">
                    <Label htmlFor={select.id}>{select.label}</Label>
                    <select
                        id={select.id}
                        value={select.value ?? ""}
                        onChange={(e) => go({ [select.id]: e.target.value, page: "" })}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">Everything</option>
                        {select.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.value} ({option.count})
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {filtered && (
                <div className="md:col-span-4">
                    <Button variant="secondary" size="sm" onClick={() => router.push("/admin/audit")}>
                        Clear filters
                    </Button>
                </div>
            )}
        </section>
    )
}
