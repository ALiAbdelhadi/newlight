"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { bulkReceiveStock, completeOpeningStocktake } from "@/app/action/catalog-actions"

interface ProductRow {
    id: string
    sku: string
    hasCost: boolean
}

interface Draft {
    quantity: string
    unitCost: string
}

export function BulkReceipt({ products }: { products: ProductRow[] }) {
    const [filter, setFilter] = useState("")
    const [drafts, setDrafts] = useState<Record<string, Draft>>({})
    const [pending, start] = useTransition()

    const visible = filter
        ? products.filter((p) => p.sku.toLowerCase().includes(filter.toLowerCase()))
        : products.slice(0, 25)

    const filled = Object.entries(drafts).filter(([, d]) => d.quantity.trim() !== "")

    const set = (id: string, field: keyof Draft, value: string) =>
        setDrafts((d) => {
            const current: Draft = d[id] ?? { quantity: "", unitCost: "" }
            return { ...d, [id]: { ...current, [field]: value } }
        })

    const submit = () =>
        start(async () => {
            const rows = filled.map(([productId, draft]) => ({
                productId,
                quantity: Number(draft.quantity),
                unitCost: draft.unitCost.trim() === "" ? null : draft.unitCost.trim(),
            }))
            const result = await bulkReceiveStock(rows)
            if (result.ok) {
                toast.success(result.message ?? "Received.")
                setDrafts({})
            } else {
                toast.error(result.error)
            }
        })

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter by SKU"
                    className="max-w-xs"
                    aria-label="Filter products by SKU"
                />
                <span className="text-sm text-muted-foreground">
                    {filter ? `${visible.length} matching` : `showing first ${visible.length} of ${products.length}`}
                </span>
                <div className="ml-auto flex items-center gap-3">
                    {filled.length > 0 && <Badge variant="outline">{filled.length} row(s) ready</Badge>}
                    <Button onClick={submit} disabled={pending || filled.length === 0}>
                        {pending ? "Recording…" : "Record receipts"}
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card max-h-[28rem]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Cost on file</TableHead>
                            <TableHead className="w-32">Quantity</TableHead>
                            <TableHead className="w-40">Unit cost</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visible.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-mono">{product.sku}</TableCell>
                                <TableCell>
                                    {product.hasCost ? (
                                        <span className="text-muted-foreground text-sm">recorded</span>
                                    ) : (
                                        <Badge variant="secondary">none</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label={`Quantity received for ${product.sku}`}
                                        inputMode="numeric"
                                        value={drafts[product.id]?.quantity ?? ""}
                                        onChange={(e) => set(product.id, "quantity", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label={`Unit cost for ${product.sku}`}
                                        inputMode="decimal"
                                        placeholder="optional"
                                        value={drafts[product.id]?.unitCost ?? ""}
                                        onChange={(e) => set(product.id, "unitCost", e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export function OpeningStocktake() {
    const [pending, start] = useTransition()

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="secondary" disabled={pending}>
                    {pending ? "Closing…" : "I have counted the stock — close the opening count"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Close the opening count?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Say this only after a physical count. From here on, stock valuation and gross margin will
                        produce numbers and those numbers will be trusted. Correct any differences first, through the
                        ledger, on each product.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Not yet</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() =>
                            start(async () => {
                                const result = await completeOpeningStocktake()
                                if (result.ok) toast.success(result.message ?? "Closed.")
                                else toast.error(result.error)
                            })
                        }
                    >
                        Close it
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
