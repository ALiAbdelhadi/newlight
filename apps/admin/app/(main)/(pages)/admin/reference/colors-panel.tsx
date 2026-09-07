"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createColor, deleteColor, updateColor } from "@/app/action/reference-actions"

interface Color {
    id: string
    key: string
    hex: string
    nameEn: string
    nameAr: string
    order: number
    isActive: boolean
    products: number
    images: number
}

/**
 * The colours a product can be offered in.
 *
 * The KEY is not editable, and that is not tidiness: `CartItem.selectedColorKey` and
 * `OrderItem.selectedColorKey` store it as a SNAPSHOT, deliberately without a foreign key, so
 * the colour a customer chose survives the colour being changed. Renaming the key would orphan
 * every one of those past choices.
 *
 * Deleting is refused while any product offers it — `ProductAvailableColor` cascades, so the
 * database would remove it from all of them silently. Deactivating is the reversible answer.
 */
export function ColorsPanel({ colors }: { colors: Color[] }) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [editing, setEditing] = useState<string | null>(null)
    const [draft, setDraft] = useState({ key: "", hex: "#000000", nameEn: "", nameAr: "", order: "0", isActive: true })

    const call = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
        start(async () => {
            const result = await fn()
            if (result.ok) { toast.success(result.message ?? "Saved."); after?.(); router.refresh() }
            else toast.error(result.error ?? "Something went wrong.")
        })

    const reset = () => { setEditing(null); setDraft({ key: "", hex: "#000000", nameEn: "", nameAr: "", order: "0", isActive: true }) }

    return (
        <div className="space-y-6">
            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4 max-w-4xl">
                <h2 className="font-semibold">{editing ? `Editing ${draft.key}` : "Add a colour"}</h2>
                {editing && (
                    <p className="text-sm text-muted-foreground">
                        The key cannot change: every past cart and order stored it as a snapshot of what the customer
                        chose, without a foreign key, so renaming it would orphan all of them.
                    </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="c-key">Key</Label>
                        <Input id="c-key" value={draft.key} disabled={editing !== null}
                            onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="BRUSHED_BRASS" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="c-hex">Colour</Label>
                        <div className="flex gap-2">
                            <Input id="c-hex" value={draft.hex} onChange={(e) => setDraft({ ...draft, hex: e.target.value })} className="font-mono" />
                            <input
                                type="color"
                                aria-label="Pick the colour"
                                value={/^#[0-9A-Fa-f]{6}$/.test(draft.hex) ? draft.hex : "#000000"}
                                onChange={(e) => setDraft({ ...draft, hex: e.target.value.toUpperCase() })}
                                className="h-9 w-12 rounded-md border border-input bg-transparent"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="c-order">Order</Label>
                        <Input id="c-order" inputMode="numeric" value={draft.order}
                            onChange={(e) => setDraft({ ...draft, order: e.target.value })} className="tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="c-en">Name (English)</Label>
                        <Input id="c-en" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="c-ar">Name (Arabic)</Label>
                        <Input id="c-ar" dir="rtl" value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} />
                    </div>
                    {editing && (
                        <div className="space-y-1.5">
                            <Label htmlFor="c-active">Offered</Label>
                            <Button id="c-active" type="button" variant={draft.isActive ? "default" : "secondary"}
                                className="w-full" onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}>
                                {draft.isActive ? "Offered" : "Not offered"}
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button
                        disabled={pending || !draft.nameEn.trim() || !draft.nameAr.trim() || (!editing && !draft.key.trim())}
                        onClick={() =>
                            call(() =>
                                editing
                                    ? updateColor(editing, { hex: draft.hex, nameEn: draft.nameEn, nameAr: draft.nameAr, order: Number(draft.order) || 0, isActive: draft.isActive })
                                    : createColor({ key: draft.key, hex: draft.hex, nameEn: draft.nameEn, nameAr: draft.nameAr, order: Number(draft.order) || 0 }),
                            reset)
                        }
                    >
                        {pending ? "Saving…" : editing ? "Save" : "Add"}
                    </Button>
                    {editing && <Button variant="secondary" onClick={reset}>Cancel</Button>}
                </div>
            </section>

            <div className="overflow-x-auto border rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Colour</TableHead>
                            <TableHead>Key</TableHead>
                            <TableHead className="text-right">In use</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {colors.map((color) => {
                            const used = color.products > 0 || color.images > 0
                            return (
                                <TableRow key={color.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <span className="h-6 w-6 rounded-full border shrink-0" style={{ background: color.hex }} aria-hidden />
                                            <div>
                                                <div className="font-medium">
                                                    {color.nameEn}
                                                    {!color.isActive && <Badge variant="secondary" className="ml-2">not offered</Badge>}
                                                </div>
                                                <div className="text-sm text-muted-foreground" dir="rtl">{color.nameAr}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{color.key}<div className="text-xs text-muted-foreground">{color.hex}</div></TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                        {color.products} product{color.products === 1 ? "" : "s"}
                                        <div className="text-xs text-muted-foreground">{color.images} photo{color.images === 1 ? "" : "s"}</div>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <Button size="sm" variant="secondary" disabled={pending}
                                            onClick={() => { setEditing(color.id); setDraft({ key: color.key, hex: color.hex, nameEn: color.nameEn, nameAr: color.nameAr, order: String(color.order), isActive: color.isActive }) }}>
                                            Edit
                                        </Button>
                                        {!used && (
                                            <Button size="sm" variant="ghost" className="ml-2 text-destructive hover:text-destructive"
                                                disabled={pending} onClick={() => call(() => deleteColor(color.id))}>
                                                Delete
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
