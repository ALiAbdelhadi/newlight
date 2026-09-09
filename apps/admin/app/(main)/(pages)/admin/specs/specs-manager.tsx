"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createSpec, deleteSpec, updateSpec } from "@/app/action/spec-actions"
import { NativeSelect } from "@/components/ui/native-select"

type ValueType = "NUMBER" | "TEXT" | "BOOLEAN"

export interface SpecRow {
    key: string
    valueType: ValueType
    labelEn: string
    labelAr: string
    unitEn: string | null
    unitAr: string | null
    order: number
    usedByProducts: number
    askedByCategories: number
}

const TYPES: Array<{ value: ValueType; hint: string }> = [
    { value: "NUMBER", hint: "Filterable by range. Non-numeric answers are still kept as text." },
    { value: "TEXT", hint: "Any answer, including ranges like 220-240." },
    { value: "BOOLEAN", hint: "Yes or no." },
]

const empty = {
    key: "",
    valueType: "TEXT" as ValueType,
    labelEn: "",
    labelAr: "",
    unitEn: "",
    unitAr: "",
    order: "0",
}

export function SpecsManager({ definitions }: { definitions: SpecRow[] }) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [editing, setEditing] = useState<string | null>(null)
    const [draft, setDraft] = useState(empty)

    const call = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
        start(async () => {
            const result = await fn()
            if (result.ok) {
                toast.success(result.message ?? "Saved.")
                after?.()
                router.refresh()
            } else {
                toast.error(result.error ?? "Something went wrong.")
            }
        })

    const beginEdit = (row: SpecRow) => {
        setEditing(row.key)
        setDraft({
            key: row.key,
            valueType: row.valueType,
            labelEn: row.labelEn,
            labelAr: row.labelAr,
            unitEn: row.unitEn ?? "",
            unitAr: row.unitAr ?? "",
            order: String(row.order),
        })
    }

    const payload = () => ({
        valueType: draft.valueType,
        labelEn: draft.labelEn,
        labelAr: draft.labelAr,
        unitEn: draft.unitEn.trim() || null,
        unitAr: draft.unitAr.trim() || null,
        order: Number(draft.order) || 0,
    })

    return (
        <div className="space-y-8">
            <section className="rounded-lg border bg-card p-3 space-y-4 max-w-4xl">
                <h2 className="font-semibold">{editing ? `Editing ${editing}` : "Add a specification"}</h2>
                <p className="text-sm text-muted-foreground">
                    {editing
                        ? "The key cannot change — it is what every product's value points at, and it is written into the storefront's filters. Renaming it would be a migration, not an edit."
                        : "The key is referenced from SQL and from the storefront's filters: lowercase letters, digits and underscores."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="key">Key</Label>
                        <Input
                            id="key"
                            value={draft.key}
                            disabled={editing !== null}
                            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                            placeholder="housing_finish"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="type">Type</Label>
                        <NativeSelect
                            id="type"
                            value={draft.valueType}
                            onChange={(e) => setDraft({ ...draft, valueType: e.target.value as ValueType })}
                            >
                            {TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.value}
                                </option>
                            ))}
                        </NativeSelect>
                        <p className="text-xs text-muted-foreground">
                            {TYPES.find((t) => t.value === draft.valueType)?.hint}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="order">Order</Label>
                        <Input
                            id="order"
                            inputMode="numeric"
                            value={draft.order}
                            onChange={(e) => setDraft({ ...draft, order: e.target.value })}
                            className="tabular-nums"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="labelEn">Label (English)</Label>
                        <Input id="labelEn" value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="labelAr">Label (Arabic)</Label>
                        <Input id="labelAr" dir="rtl" value={draft.labelAr} onChange={(e) => setDraft({ ...draft, labelAr: e.target.value })} />
                    </div>
                    <div />

                    <div className="space-y-1.5">
                        <Label htmlFor="unitEn">Unit (English)</Label>
                        <Input id="unitEn" value={draft.unitEn} onChange={(e) => setDraft({ ...draft, unitEn: e.target.value })} placeholder="W, lm, mm" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="unitAr">Unit (Arabic)</Label>
                        <Input id="unitAr" dir="rtl" value={draft.unitAr} onChange={(e) => setDraft({ ...draft, unitAr: e.target.value })} />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        disabled={pending || !draft.key.trim() || !draft.labelEn.trim() || !draft.labelAr.trim()}
                        onClick={() =>
                            call(
                                () => (editing ? updateSpec(editing, payload()) : createSpec({ key: draft.key, ...payload() })),
                                () => {
                                    setEditing(null)
                                    setDraft(empty)
                                }
                            )
                        }
                    >
                        {pending ? "Saving…" : editing ? "Save" : "Add"}
                    </Button>
                    {editing && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setEditing(null)
                                setDraft(empty)
                            }}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </section>

            <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Label</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Order</TableHead>
                            <TableHead className="text-right">In use</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {definitions.map((row) => (
                            <TableRow key={row.key}>
                                <TableCell className="font-mono text-sm">{row.key}</TableCell>
                                <TableCell>
                                    <div>{row.labelEn}{row.unitEn ? <span className="text-muted-foreground"> ({row.unitEn})</span> : null}</div>
                                    <div className="text-sm text-muted-foreground" dir="rtl">{row.labelAr}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{row.valueType.toLowerCase()}</Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{row.order}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {/* What would be destroyed by a delete — the reason deletion is refused. */}
                                    {row.usedByProducts} product{row.usedByProducts === 1 ? "" : "s"}
                                    <div className="text-xs text-muted-foreground">
                                        {row.askedByCategories} sub-categor{row.askedByCategories === 1 ? "y" : "ies"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    <Button size="sm" variant="secondary" onClick={() => beginEdit(row)} disabled={pending}>
                                        Edit
                                    </Button>
                                    {row.usedByProducts === 0 && row.askedByCategories === 0 && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="ml-2 text-destructive hover:text-destructive" disabled={pending}>
                                                    Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete {row.labelEn}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Nothing uses it, so nothing is lost. If a product ever had a value
                                                        for it, this would be refused.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={() => call(() => deleteSpec(row.key))}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
