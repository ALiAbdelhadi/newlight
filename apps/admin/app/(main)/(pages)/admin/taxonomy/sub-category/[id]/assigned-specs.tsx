"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { setSubCategorySpecs } from "@/app/action/spec-actions"

interface Definition {
    key: string
    labelEn: string
    labelAr: string
    unitEn: string | null
}

interface Assignment {
    specKey: string
    required: boolean
}

export function AssignedSpecs({
    subCategoryId,
    definitions,
    assigned,
}: {
    subCategoryId: string
    definitions: Definition[]
    assigned: Assignment[]
}) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [selected, setSelected] = useState<Map<string, boolean>>(
        new Map(assigned.map((a) => [a.specKey, a.required]))
    )

    const toggle = (key: string) =>
        setSelected((current) => {
            const next = new Map(current)
            if (next.has(key)) next.delete(key)
            else next.set(key, false)
            return next
        })

    const toggleRequired = (key: string) =>
        setSelected((current) => {
            const next = new Map(current)
            if (next.has(key)) next.set(key, !next.get(key))
            return next
        })

    const dirty =
        selected.size !== assigned.length ||
        assigned.some((a) => !selected.has(a.specKey) || selected.get(a.specKey) !== a.required)

    const save = () =>
        start(async () => {
            const specs = [...selected.entries()].map(([specKey, required], order) => ({ specKey, required, order }))
            const result = await setSubCategorySpecs(subCategoryId, specs)
            if (result.ok) {
                toast.success(result.message ?? "Saved.")
                router.refresh()
            } else {
                toast.error(result.error ?? "Something went wrong.")
            }
        })

    return (
        <section className="rounded-lg border bg-card p-3 space-y-4">
            <div>
                <h2 className="font-semibold">Specifications asked for</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    These appear on every product in this sub-category, whether or not it has a value yet — that is
                    what makes a missing measurement fillable instead of invisible. Removing one keeps the values
                    products already have.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {definitions.map((definition) => {
                    const chosen = selected.has(definition.key)
                    const required = selected.get(definition.key) === true
                    return (
                        <div key={definition.key} className="flex items-center">
                            <Button
                                type="button"
                                size="sm"
                                variant={chosen ? "default" : "secondary"}
                                onClick={() => toggle(definition.key)}
                                disabled={pending}
                                className={chosen ? "rounded-e-none" : undefined}
                            >
                                {definition.labelEn}
                                {definition.unitEn ? ` (${definition.unitEn})` : ""}
                            </Button>
                            {chosen && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={required ? "destructive" : "secondary"}
                                    onClick={() => toggleRequired(definition.key)}
                                    disabled={pending}
                                    className="rounded-s-none border-s"
                                    title="Required means the data-quality queue reports it when missing"
                                >
                                    {required ? "required" : "optional"}
                                </Button>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="flex items-center gap-3">
                <Button onClick={save} disabled={pending || !dirty}>
                    {pending ? "Saving…" : dirty ? "Save specifications" : "Saved"}
                </Button>
                <Badge variant="outline">{selected.size} selected</Badge>
            </div>
        </section>
    )
}
