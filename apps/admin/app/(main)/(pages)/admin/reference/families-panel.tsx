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
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { archiveFamily, createFamily, updateFamily } from "@/app/action/reference-actions"
import { NativeSelect } from "@/components/ui/native-select"

interface Family {
    id: string
    slug: string
    variantType: string | null
    order: number
    products: number
    subCategory: string
    nameEn: string
    nameAr: string
}

/**
 * A family groups the wattages or sizes of one fixture into a single storefront card.
 *
 * Archiving one does not delete anything: `Product.familyId` is SET NULL, so every member
 * becomes a standalone product. The dialog says the number, because "3 products will appear
 * separately" is a decision and "archive?" is not.
 */
export function FamiliesPanel({
    families,
    subCategories,
}: {
    families: Family[]
    subCategories: Array<{ id: string; name: string }>
}) {
    const router = useRouter()
    const [pending, start] = useTransition()
    const [editing, setEditing] = useState<string | null>(null)
    const [draft, setDraft] = useState({ subCategoryId: "", slug: "", variantType: "", nameEn: "", nameAr: "", order: "0" })

    const call = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
        start(async () => {
            const result = await fn()
            if (result.ok) { toast.success(result.message ?? "Saved."); after?.(); router.refresh() }
            else toast.error(result.error ?? "Something went wrong.")
        })

    const reset = () => { setEditing(null); setDraft({ subCategoryId: "", slug: "", variantType: "", nameEn: "", nameAr: "", order: "0" }) }

    return (
        <div className="space-y-6">
            <section className="rounded-lg border bg-card p-3 space-y-4 max-w-4xl">
                <h2 className="font-semibold">{editing ? `Editing ${draft.slug}` : "Add a family"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="f-sub">Sub-category</Label>
                        <NativeSelect
                            id="f-sub"
                            value={draft.subCategoryId}
                            disabled={editing !== null}
                            onChange={(e) => setDraft({ ...draft, subCategoryId: e.target.value })}
                            >
                            <option value="">—</option>
                            {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="f-slug">URL</Label>
                        <Input id="f-slug" value={draft.slug} disabled={editing !== null}
                            onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="nl-a603" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="f-variant">Varies by</Label>
                        <Input id="f-variant" value={draft.variantType}
                            onChange={(e) => setDraft({ ...draft, variantType: e.target.value })} placeholder="wattage, size" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="f-en">Name (English)</Label>
                        <Input id="f-en" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="f-ar">Name (Arabic)</Label>
                        <Input id="f-ar" dir="rtl" value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="f-order">Order</Label>
                        <Input id="f-order" inputMode="numeric" value={draft.order}
                            onChange={(e) => setDraft({ ...draft, order: e.target.value })} className="tabular-nums" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        disabled={pending || !draft.nameEn.trim() || !draft.nameAr.trim() || (!editing && (!draft.slug.trim() || !draft.subCategoryId))}
                        onClick={() =>
                            call(() => {
                                const shared = {
                                    variantType: draft.variantType.trim() || null,
                                    nameEn: draft.nameEn,
                                    nameAr: draft.nameAr,
                                    order: Number(draft.order) || 0,
                                }
                                return editing
                                    ? updateFamily(editing, shared)
                                    : createFamily({ subCategoryId: draft.subCategoryId, slug: draft.slug, ...shared })
                            }, reset)
                        }
                    >
                        {pending ? "Saving…" : editing ? "Save" : "Add"}
                    </Button>
                    {editing && <Button variant="secondary" onClick={reset}>Cancel</Button>}
                </div>
            </section>

            <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Family</TableHead>
                            <TableHead>Sub-category</TableHead>
                            <TableHead>Varies by</TableHead>
                            <TableHead className="text-right">Products</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {families.map((family) => (
                            <TableRow key={family.id}>
                                <TableCell>
                                    <div className="font-medium">{family.nameEn || family.slug}</div>
                                    <div className="text-sm text-muted-foreground" dir="rtl">{family.nameAr}</div>
                                    <div className="text-xs text-muted-foreground font-mono">/{family.slug}</div>
                                </TableCell>
                                <TableCell className="text-sm">{family.subCategory}</TableCell>
                                <TableCell>
                                    {family.variantType ? <Badge variant="outline">{family.variantType}</Badge> : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{family.products}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    <Button size="sm" variant="secondary" disabled={pending}
                                        onClick={() => { setEditing(family.id); setDraft({ subCategoryId: "", slug: family.slug, variantType: family.variantType ?? "", nameEn: family.nameEn, nameAr: family.nameAr, order: String(family.order) }) }}>
                                        Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="ghost" className="ml-2 text-destructive hover:text-destructive" disabled={pending}>
                                                Archive
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Archive {family.nameEn || family.slug}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {family.products === 0
                                                        ? "It has no products, so nothing else changes."
                                                        : `Its ${family.products} product(s) are NOT deleted — they become standalone and appear separately on the storefront instead of as one card.`}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => call(() => archiveFamily(family.id))}>Archive</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
