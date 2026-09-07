"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Money } from "@/components/money"
import { EmptyState } from "@/components/states"
import { Workflow, WorkflowResult } from "@/components/workflow/workflow"
import { CellText } from "@/components/data-table/cell-text"
import type { PricingFormula, PricingPreview, PricingScope } from "@/lib/services/pricing-service"
import { applyPricing, previewPricing } from "@/app/action/pricing-actions"

/**
 * Reference screen 3 (P4.5 §23) — bulk repricing as a Workflow.
 *
 * The logic underneath is unchanged and was already right: `PricingService.preview()` mints a
 * token from the scope, the formula and the resulting rows, and `apply()` re-previews and
 * compares tokens, so a catalogue that moved between looking and committing is refused by the
 * service rather than by a UI convention.
 *
 * What changes is that the operation now LOOKS like what it is. The previous screen put scope,
 * formula, preview and commit on one page as four panels, so "preview" was a button among
 * buttons and it was possible to read the numbers, change the percentage, and press Apply
 * while looking at a table describing the previous formula. The token caught that — but only
 * after the person had already decided. Four steps make the order the screen's shape.
 */

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

const SCOPE_LABELS = {
    category: "Category",
    subCategory: "Sub-category",
    family: "Family",
    products: "Specific SKUs",
} as const

export function PricingEditor({ categories, subCategories, families }: Props) {
    const [scopeKind, setScopeKind] = useState<PricingScope["kind"]>("subCategory")
    const [scopeId, setScopeId] = useState("")
    const [formulaKind, setFormulaKind] = useState<FormulaKind>("percent")
    const [percent, setPercent] = useState("10")
    const [amount, setAmount] = useState("")
    const [multiplier, setMultiplier] = useState("1.5736")
    const [addend, setAddend] = useState("55.3")

    const [preview, setPreview] = useState<PricingPreview | null>(null)
    const [committed, setCommitted] = useState<{ count: number; message: string } | null>(null)
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
                return {
                    kind: "products",
                    productIds: scopeId.split(",").map((s) => s.trim()).filter(Boolean),
                }
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

    /*
     * Any edit to the scope or the formula throws the preview away.
     *
     * The service would refuse a stale commit anyway — the token would not match — but a
     * refusal arrives after the decision. Clearing the table means the numbers on screen
     * always describe the inputs on screen, so the decision is made against the truth.
     */
    function invalidate<T>(setter: (value: T) => void) {
        return (value: T) => {
            setPreview(null)
            setter(value)
        }
    }

    const options: Option[] =
        scopeKind === "category" ? categories : scopeKind === "subCategory" ? subCategories : families

    function runPreview() {
        const scope = buildScope()
        if (!scope) return
        start(async () => {
            const result = await previewPricing(scope, buildFormula())
            if (result.ok) setPreview(result.preview)
            else {
                setPreview(null)
                toast.error(result.error)
            }
        })
    }

    function commit() {
        const scope = buildScope()
        if (!scope || !preview) return
        start(async () => {
            const result = await applyPricing(scope, buildFormula(), preview.token)
            if (result.ok) {
                setCommitted({ count: preview.count, message: result.message })
                setPreview(null)
            } else {
                // A token mismatch lands here: the catalogue changed while this was open.
                toast.error(result.error)
                setPreview(null)
            }
        })
    }

    if (committed) {
        return (
            <div className="p-4">
                <WorkflowResult title={committed.message}>
                    <p>
                        {committed.count} price{committed.count === 1 ? "" : "s"} changed. Each one is in the
                        audit trail with your name and the previous value.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <Link href="/admin/audit?entity=Product">View the audit entries</Link>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCommitted(null)}
                            className="h-7 text-xs"
                        >
                            Reprice something else
                        </Button>
                    </div>
                </WorkflowResult>
            </div>
        )
    }

    return (
        <div className="p-4">
            <Workflow
                busy={pending}
                steps={[
                    {
                        id: "scope",
                        title: "Define scope",
                        validate: () => (scopeId ? true : "Choose what to reprice first."),
                        content: (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Reprice by</Label>
                                    <ToggleGroup
                                        type="single"
                                        value={scopeKind}
                                        onValueChange={(value) => {
                                            if (!value) return
                                            setPreview(null)
                                            setScopeKind(value as PricingScope["kind"])
                                            setScopeId("")
                                        }}
                                    >
                                        {(Object.keys(SCOPE_LABELS) as Array<keyof typeof SCOPE_LABELS>).map(
                                            (kind) => (
                                                <ToggleGroupItem key={kind} value={kind}>
                                                    {SCOPE_LABELS[kind]}
                                                </ToggleGroupItem>
                                            )
                                        )}
                                    </ToggleGroup>
                                </div>

                                {scopeKind === "products" ? (
                                    <div className="space-y-1 max-w-[520px]">
                                        <Label htmlFor="skus" className="text-xs">
                                            Product ids, comma separated
                                        </Label>
                                        <Input
                                            id="skus"
                                            value={scopeId}
                                            onChange={(event) => invalidate(setScopeId)(event.target.value)}
                                            className="h-[30px] font-mono text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1 max-w-[380px]">
                                        <Label htmlFor="scope" className="text-xs">
                                            Choose one
                                        </Label>
                                        <Select value={scopeId} onValueChange={invalidate(setScopeId)}>
                                            <SelectTrigger id="scope" size="sm" className="h-[30px] w-full text-sm">
                                                <SelectValue placeholder="—" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.map((option) => (
                                                    <SelectItem
                                                        key={option.id}
                                                        value={option.id}
                                                        className="text-xs"
                                                    >
                                                        {option.name}
                                                        {option.productCount !== undefined
                                                            ? ` (${option.productCount})`
                                                            : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        id: "formula",
                        title: "Configure formula",
                        content: (
                            <div className="space-y-3">
                                <ToggleGroup
                                    type="single"
                                    value={formulaKind}
                                    onValueChange={(value) => {
                                        if (!value) return
                                        setPreview(null)
                                        setFormulaKind(value as FormulaKind)
                                    }}
                                >
                                    {(Object.keys(FORMULA_LABELS) as FormulaKind[]).map((kind) => (
                                        <ToggleGroupItem key={kind} value={kind}>
                                            {FORMULA_LABELS[kind]}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>

                                <div className="flex flex-wrap gap-3">
                                    {formulaKind === "percent" && (
                                        <Field
                                            id="percent"
                                            label="Percent"
                                            hint="Negative reduces. −10 takes a tenth off."
                                            value={percent}
                                            onChange={invalidate(setPercent)}
                                        />
                                    )}
                                    {(formulaKind === "fixed" || formulaKind === "set") && (
                                        <Field
                                            id="amount"
                                            label={formulaKind === "set" ? "New price" : "Amount"}
                                            value={amount}
                                            onChange={invalidate(setAmount)}
                                        />
                                    )}
                                    {formulaKind === "linear" && (
                                        <>
                                            <Field
                                                id="multiplier"
                                                label="Multiplier"
                                                value={multiplier}
                                                onChange={invalidate(setMultiplier)}
                                            />
                                            <Field
                                                id="addend"
                                                label="Then add"
                                                value={addend}
                                                onChange={invalidate(setAddend)}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        id: "preview",
                        title: "Preview old → new",
                        validate: () =>
                            preview && preview.count > 0
                                ? true
                                : "Generate a preview before continuing.",
                        content: (
                            <div className="space-y-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={runPreview}
                                    disabled={pending}
                                    className="h-7 text-xs"
                                >
                                    {pending ? "Calculating…" : preview ? "Recalculate" : "Generate preview"}
                                </Button>

                                {!preview ? (
                                    <EmptyState
                                        variant="no-data"
                                        title="Nothing previewed yet"
                                        description="Generate a preview to see exactly which prices change and by how much."
                                    />
                                ) : preview.count === 0 ? (
                                    <EmptyState
                                        variant="no-results"
                                        title="That selection contains no products"
                                        description="Go back and widen the scope."
                                    />
                                ) : (
                                    <PreviewTable preview={preview} />
                                )}
                            </div>
                        ),
                    },
                ]}
                commitSummary={{
                    title: `Change ${preview?.count ?? 0} price${preview?.count === 1 ? "" : "s"}?`,
                    description:
                        "The storefront updates immediately. Orders already placed keep the price they recorded.",
                    confirmLabel: "Commit price change",
                    impact: {
                        affectedCount: preview?.count ?? 0,
                        financialImpact: preview?.newTotal,
                        sideEffects: [
                            preview
                                ? `Catalogue total moves from ${preview.oldTotal} to ${preview.newTotal}`
                                : "",
                            "Every changed product gets an audit entry with its previous price",
                            "Orders already placed are never rewritten",
                        ].filter(Boolean),
                    },
                }}
                onCommit={commit}
            />
        </div>
    )
}

function Field({
    id,
    label,
    hint,
    value,
    onChange,
}: {
    id: string
    label: string
    hint?: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="space-y-1">
            <Label htmlFor={id} className="text-xs">
                {label}
            </Label>
            <Input
                id={id}
                inputMode="decimal"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-[30px] w-32 tabular-nums text-sm"
            />
            {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
        </div>
    )
}

function PreviewTable({ preview }: { preview: PricingPreview }) {
    return (
        <div className="space-y-2">
            <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border border-border-strong bg-surface-sunk px-3 py-2 text-xs">
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Products</dt>
                    <dd className="font-medium tabular-nums">{preview.count}</dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Total now</dt>
                    <dd>
                        <Money value={preview.oldTotal} />
                    </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Total after</dt>
                    <dd className="font-medium">
                        <Money value={preview.newTotal} />
                    </dd>
                </div>
            </dl>

            {preview.invalid.length > 0 && (
                /*
                 * The database's `products_price_positive` constraint would reject these on
                 * commit anyway. Catching them here means the operator sees WHICH rows are
                 * the problem instead of a failed transaction naming none of them.
                 */
                <p role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
                    {preview.invalid.length} product{preview.invalid.length === 1 ? "" : "s"} would be priced at
                    or below zero and the commit will be refused:{" "}
                    <span className="font-mono">
                        {preview.invalid.slice(0, 5).map((row) => row.sku).join(", ")}
                    </span>
                </p>
            )}

            <div className="max-h-[420px] overflow-auto rounded-md border border-border-strong">
                <table className="w-full border-collapse text-left">
                    <caption className="sr-only">
                        Prices before and after, {preview.count} products
                    </caption>
                    <thead className="sticky top-0 bg-surface-sunk">
                        <tr className="h-8 border-b border-border-strong">
                            <th scope="col" className="px-2.5 text-xs font-medium text-muted-foreground">
                                SKU
                            </th>
                            <th scope="col" className="px-2.5 text-xs font-medium text-muted-foreground">
                                Product
                            </th>
                            <th scope="col" className="px-2.5 text-right text-xs font-medium text-muted-foreground">
                                Now
                            </th>
                            <th scope="col" className="px-2.5 text-right text-xs font-medium text-muted-foreground">
                                After
                            </th>
                            <th scope="col" className="px-2.5 text-right text-xs font-medium text-muted-foreground">
                                Change
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.rows.map((row) => (
                            <tr key={row.productId} className="h-[34px] border-b">
                                <td className="px-2.5 font-mono text-xs">{row.sku}</td>
                                <td className="max-w-[280px] px-2.5 text-sm">
                                    <CellText>{row.name}</CellText>
                                </td>
                                <td className="px-2.5 text-right text-sm text-muted-foreground">
                                    <Money value={row.oldPrice} />
                                </td>
                                <td className="px-2.5 text-right text-sm font-medium">
                                    <Money value={row.newPrice} />
                                </td>
                                <td className="px-2.5 text-right text-sm">
                                    <Money value={row.delta} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
