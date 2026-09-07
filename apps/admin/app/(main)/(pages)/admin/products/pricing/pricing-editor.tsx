"use client"

import { useState, useTransition } from "react"
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
import type { PricingFormula, PricingPreview, PricingScope } from "@/lib/services/pricing-service"
import { applyPricing, previewPricing } from "@/app/action/pricing-actions"

interface Option {
    id: string
    name: string
    productCount?: number
}

interface Props {
    categories: Option[]
    subCategories: Array<Option & { categoryId: string }>
    families: Array<Option & { subCategoryId: string }>
}

type FormulaKind = PricingFormula["kind"]

const FORMULA_LABELS: Record<FormulaKind, string> = {
    percent: "By percentage",
    fixed: "By a fixed amount",
    set: "Set to one price",
    linear: "× multiplier + amount",
}

export function PricingEditor({ categories, subCategories, families }: Props) {
    const [scopeKind, setScopeKind] = useState<PricingScope["kind"]>("subCategory")
    const [scopeId, setScopeId] = useState<string>("")
    const [formulaKind, setFormulaKind] = useState<FormulaKind>("percent")
    const [percent, setPercent] = useState("10")
    const [amount, setAmount] = useState("")
    const [multiplier, setMultiplier] = useState("1.5736")
    const [addend, setAddend] = useState("55.3")

    const [preview, setPreview] = useState<PricingPreview | null>(null)
    const [pending, start] = useTransition()

    function buildScope(): PricingScope | null {
        if (!scopeId) return null
        switch (scopeKind) {
            case "category":
                return { kind: "category", categoryId: scopeId }
            case "subCategory":
                return { kind: "subCategory", subCategoryId: scopeId }
            case "family":
                return { kind: "family", familyId: scopeId }
            case "products":
                return { kind: "products", productIds: scopeId.split(",").map((s) => s.trim()).filter(Boolean) }
        }
    }

    function buildFormula(): PricingFormula {
        switch (formulaKind) {
            case "percent":
                return { kind: "percent", percent }
            case "fixed":
                return { kind: "fixed", amount }
            case "set":
                return { kind: "set", amount }
            case "linear":
                return { kind: "linear", multiplier, addend }
        }
    }

    const options: Option[] =
        scopeKind === "category" ? categories : scopeKind === "subCategory" ? subCategories : families

    // Any edit invalidates the preview. Leaving a stale table on screen next to changed inputs
    // is how someone applies a formula they are no longer looking at — the token would refuse
    // it, but only after they had already decided.
    function invalidate<T>(setter: (value: T) => void) {
        return (value: T) => {
            setPreview(null)
            setter(value)
        }
    }

    const runPreview = () => {
        const scope = buildScope()
        if (!scope) return toast.error("Choose what to reprice first.")
        start(async () => {
            const result = await previewPricing(scope, buildFormula())
            if (result.ok) {
                setPreview(result.preview)
                if (result.preview.count === 0) toast.info("Nothing matches that scope.")
            } else {
                setPreview(null)
                toast.error(result.error)
            }
        })
    }

    const commit = () => {
        const scope = buildScope()
        if (!scope || !preview) return
        start(async () => {
            const result = await applyPricing(scope, buildFormula(), preview.token)
            if (result.ok) {
                toast.success(result.message)
                setPreview(null)
            } else {
                toast.error(result.error)
            }
        })
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                    <h2 className="font-semibold">1. What to reprice</h2>
                    <div className="flex flex-wrap gap-2">
                        {(["category", "subCategory", "family", "products"] as const).map((kind) => (
                            <Button
                                key={kind}
                                type="button"
                                size="sm"
                                variant={scopeKind === kind ? "default" : "secondary"}
                                onClick={() => {
                                    setPreview(null)
                                    setScopeKind(kind)
                                    setScopeId("")
                                }}
                            >
                                {kind === "subCategory" ? "Sub-category" : kind === "products" ? "Specific SKUs" : kind}
                            </Button>
                        ))}
                    </div>

                    {scopeKind === "products" ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="skus">Product ids, comma separated</Label>
                            <Input id="skus" value={scopeId} onChange={(e) => invalidate(setScopeId)(e.target.value)} />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <Label htmlFor="scope">Choose one</Label>
                            <select
                                id="scope"
                                value={scopeId}
                                onChange={(e) => invalidate(setScopeId)(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                            >
                                <option value="">—</option>
                                {options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                        {option.productCount !== undefined ? ` (${option.productCount})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </section>

                <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                    <h2 className="font-semibold">2. How to change it</h2>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(FORMULA_LABELS) as FormulaKind[]).map((kind) => (
                            <Button
                                key={kind}
                                type="button"
                                size="sm"
                                variant={formulaKind === kind ? "default" : "secondary"}
                                onClick={() => {
                                    setPreview(null)
                                    setFormulaKind(kind)
                                }}
                            >
                                {FORMULA_LABELS[kind]}
                            </Button>
                        ))}
                    </div>

                    {formulaKind === "percent" && (
                        <div className="space-y-1.5">
                            <Label htmlFor="percent">Percent</Label>
                            <Input
                                id="percent"
                                value={percent}
                                onChange={(e) => invalidate(setPercent)(e.target.value)}
                                inputMode="decimal"
                            />
                            <p className="text-xs text-muted-foreground">
                                <span className="font-mono">10</span> raises by 10%,{" "}
                                <span className="font-mono">-5</span> cuts by 5%.
                            </p>
                        </div>
                    )}

                    {(formulaKind === "fixed" || formulaKind === "set") && (
                        <div className="space-y-1.5">
                            <Label htmlFor="amount">Amount (EGP)</Label>
                            <Input
                                id="amount"
                                value={amount}
                                onChange={(e) => invalidate(setAmount)(e.target.value)}
                                inputMode="decimal"
                            />
                            <p className="text-xs text-muted-foreground">
                                {formulaKind === "fixed"
                                    ? "Added to every price. Use a negative number to take it off."
                                    : "Every matched product becomes exactly this price."}
                            </p>
                        </div>
                    )}

                    {formulaKind === "linear" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="multiplier">Multiplier</Label>
                                <Input
                                    id="multiplier"
                                    value={multiplier}
                                    onChange={(e) => invalidate(setMultiplier)(e.target.value)}
                                    inputMode="decimal"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="addend">Then add</Label>
                                <Input
                                    id="addend"
                                    value={addend}
                                    onChange={(e) => invalidate(setAddend)(e.target.value)}
                                    inputMode="decimal"
                                />
                            </div>
                            {/* Pre-filled with the real tier C numbers, because this shape exists
                                because tier C needed it. */}
                            <p className="text-xs text-muted-foreground col-span-2">
                                price × multiplier + amount, rounded to 2 decimals.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <div className="flex items-center gap-3">
                <Button onClick={runPreview} disabled={pending}>
                    {pending && !preview ? "Working…" : "Preview"}
                </Button>
                {preview && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={pending || preview.count === 0 || preview.invalid.length > 0}>
                                Apply to {preview.count} product{preview.count === 1 ? "" : "s"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Change {preview.count} prices?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The catalog total goes from {preview.oldTotal} to {preview.newTotal}. Orders already
                                    placed keep the price they were charged. This is recorded in the audit log and can
                                    be read back as price history.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={commit}>Apply</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                {preview && preview.invalid.length > 0 && (
                    <p className="text-sm text-destructive">
                        {preview.invalid.length} product(s) would end up at or below zero. Nothing can be applied until
                        the formula changes.
                    </p>
                )}
            </div>

            {preview && (
                <section>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h2 className="font-semibold text-lg">Preview</h2>
                        <Badge variant="outline">{preview.count} products</Badge>
                        <span className="text-sm text-muted-foreground tabular-nums">
                            {preview.oldTotal} → {preview.newTotal}
                        </span>
                    </div>
                    <div className="overflow-x-auto border rounded-lg shadow max-h-[32rem]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Now</TableHead>
                                    <TableHead className="text-right">Becomes</TableHead>
                                    <TableHead className="text-right">Change</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {preview.rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Nothing matches that scope.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    preview.rows.map((row) => {
                                        const invalid = preview.invalid.some((r) => r.productId === row.productId)
                                        return (
                                            <TableRow key={row.productId} className={invalid ? "bg-destructive/5" : undefined}>
                                                <TableCell className="font-mono">{row.sku}</TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {row.oldPrice}
                                                </TableCell>
                                                <TableCell className={`text-right tabular-nums font-medium ${invalid ? "text-destructive" : ""}`}>
                                                    {row.newPrice}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right tabular-nums ${row.delta.startsWith("-") ? "text-red-600" : "text-green-600"}`}
                                                >
                                                    {row.delta.startsWith("-") ? row.delta : `+${row.delta}`}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            )}
        </div>
    )
}
