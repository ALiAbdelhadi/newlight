"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Facet {
    value: string
    count: number
}

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

    const selects = [
        { id: "action", label: "Action", options: facets.actions, value: current.action, width: "w-44" },
        { id: "entity", label: "Entity", options: facets.entities, value: current.entity, width: "w-36" },
        { id: "actor", label: "Who", options: facets.actors, value: current.actor, width: "w-52" },
    ] as const

    return (
        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
            <div className="relative">
                <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    id="q"
                    defaultValue={current.q ?? ""}
                    aria-label="Search the audit log"
                    placeholder="An action, an id, an email"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") go({ q: (e.target as HTMLInputElement).value, page: "" })
                    }}
                    className="w-64 pl-7"
                />
            </div>

            {selects.map((select) => (
                <Select
                    key={select.id}
                    value={select.value || "__all"}
                    onValueChange={(next) => go({ [select.id]: next === "__all" ? "" : next, page: "" })}
                >
                    <SelectTrigger
                        aria-label={select.label}
                        className={`text-xs ${select.width} ${select.value ? "border-ring" : ""}`}
                    >
                        <SelectValue placeholder={select.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all" className="text-xs">
                            {select.label}: all
                        </SelectItem>
                        {select.options.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                                {option.value}
                                <span className="ml-1.5 tabular-nums text-muted-foreground">({option.count})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}

            {filtered && (
                <Button
                    variant="ghost"
                    onClick={() => router.push("/admin/audit")}
                    className="px-2 text-muted-foreground"
                >
                    <X aria-hidden className="mr-1 size-3" />
                    Clear
                </Button>
            )}
        </div>
    )
}
