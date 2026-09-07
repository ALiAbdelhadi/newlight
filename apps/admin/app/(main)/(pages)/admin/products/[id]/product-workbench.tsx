"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TranslationPair, TranslationFields } from "@/lib/services/translation-service"
import type { DeletionBlockers } from "@/lib/services/catalog-service"
import type { SpecRow } from "@/lib/services/spec-service"
import type { ActionResult } from "@/app/action/catalog-actions"
import { ImagesPanel, type ColorOption, type ImageRow } from "./images-panel"
import { RecordLayout, type AuditEntry } from "@/components/record/record-layout"
import { BilingualField } from "@/components/bilingual-field"
import { ConfirmAction } from "@/components/confirm-action"
import { StatusBadge } from "@/components/status-badge"
import { Money } from "@/components/money"
import { deriveStockState } from "@/lib/status"
import {
    adjustStock,
    hardDeleteProduct,
    receiveStock,
    recordDamage,
    renameProduct,
    restoreProduct,
    saveProductSpecs,
    setProductPrice,
    saveTranslations,
    setProductActive,
    softDeleteProduct,
} from "@/app/action/catalog-actions"

interface Movement {
    id: string
    type: string
    quantity: number
    reason: string | null
    unitCost: string | null
    actorType: string | null
    createdAt: string
}

interface Props {
    initialTab: "translations" | "images" | "inventory" | "price" | "specs" | "settings"
    productId: string
    sku: string
    slug: string
    isActive: boolean
    isArchived: boolean
    price: string
    averageCost: string | null
    onHand: number
    reserved: number
    translations: TranslationPair
    blockers: DeletionBlockers
    movements: Movement[]
    priceHistory: Array<{ createdAt: Date; actorEmail: string | null; from: string; to: string; action: string }>
    specs: SpecRow[]
    slugHistory: string[]
    images: ImageRow[]
    colors: ColorOption[]
    offeredColorIds: string[]

    /** Record-header and rail data (P4.5 §12). */
    categoryPath: string
    variantValue: string | null
    orderLineCount: number
    createdAt: string
    updatedAt: string
    audit: AuditEntry[]
}

/**
 * Every submit routes through here so the three states the database asked for — loading,
 * success, error — exist once instead of per button (ui-ux-pro-max Forms/Submit Feedback,
 * severity HIGH). A server action that returns `{ ok: false }` shows the REASON, which is the
 * whole reason the actions return instead of throwing.
 */
function useAction() {
    const [pending, start] = useTransition()
    const call = (fn: () => Promise<ActionResult>) =>
        start(async () => {
            const result = await fn()
            if (result.ok) toast.success(result.message ?? "Saved.")
            else toast.error(result.error)
        })
    return { pending, call }
}

/** A tab whose panel needs attention. One dot, one meaning — not a decorative marker. */
function AttentionDot({ label }: { label: string }) {
    return <span role="img" aria-label={label} className="size-1.5 rounded-full bg-warning" />
}

export function ProductWorkbench(props: Props) {
    const { pending, call } = useAction()
    const blockerTotal = props.blockers.orderItems + props.blockers.cartItems + props.blockers.configurations

    const translationsIncomplete = (["en", "ar"] as const).some(
        (locale) => props.translations.completeness[locale].missing.length > 0
    )
    const available = props.onHand - props.reserved

    return (
        <RecordLayout
            /*
             * The SKU is the heading, not the name, because for all 378 translation rows the
             * "name" IS the SKU (A26). A heading that repeats the line under it is worse than
             * one that admits what it knows.
             */
            title={props.sku}
            subtitle={props.categoryPath}
            identifiers={[
                { label: "Slug", value: `/${props.slug}` },
                ...(props.variantValue ? [{ label: "Variant", value: props.variantValue }] : []),
                { label: "Order lines", value: String(props.orderLineCount) },
            ]}
            status={{
                kind: "stock",
                value: deriveStockState({ onHand: props.onHand, reserved: props.reserved }),
            }}
            marks={
                <>
                    {props.isArchived ? (
                        <span className="inline-flex items-center rounded-md border border-danger-border bg-danger-bg px-1.5 py-0.5 text-2xs font-medium text-danger">
                            Archived
                        </span>
                    ) : props.isActive ? null : (
                        <span className="inline-flex items-center rounded-md border border-neutral-border bg-neutral-bg px-1.5 py-0.5 text-2xs font-medium text-neutral">
                            Hidden
                        </span>
                    )}
                    <span className="text-2xs tabular-nums text-muted-foreground">
                        {available} available · {props.onHand} on hand
                    </span>
                </>
            }
            actions={
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href="/admin/products">All products</Link>
                </Button>
            }
            defaultTab={props.initialTab}
            rail={{
                createdAt: props.createdAt,
                updatedAt: props.updatedAt,
                audit: props.audit,
                auditHref: `/admin/audit?entity=Product&entityId=${props.productId}`,
                extra: (
                    <dl className="space-y-1.5 text-2xs">
                        <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-muted-foreground">Price</dt>
                            <dd>
                                <Money value={props.price} />
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-muted-foreground">Cost</dt>
                            <dd>
                                <Money value={props.averageCost} />
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-muted-foreground">Photographs</dt>
                            <dd className="tabular-nums">{props.images.length}</dd>
                        </div>
                    </dl>
                ),
            }}
            tabs={[
                {
                    id: "translations",
                    label: "Languages",
                    badge: translationsIncomplete ? <AttentionDot label="Incomplete" /> : undefined,
                    content: (
                        <TranslationEditor
                            productId={props.productId}
                            pair={props.translations}
                            pending={pending}
                            call={call}
                        />
                    ),
                },
                {
                    id: "images",
                    label: "Photos",
                    badge: props.images.length === 0 ? <AttentionDot label="No photographs" /> : undefined,
                    content: (
                        <ImagesPanel
                            productId={props.productId}
                            sku={props.sku}
                            images={props.images}
                            colors={props.colors}
                            offeredColorIds={props.offeredColorIds}
                        />
                    ),
                },
                {
                    id: "inventory",
                    label: "Inventory",
                    content: <InventoryPanel {...props} pending={pending} call={call} />,
                },
                {
                    id: "price",
                    label: "Pricing",
                    content: <PricePanel {...props} pending={pending} call={call} />,
                },
                {
                    id: "specs",
                    label: "Specifications",
                    content: (
                        <SpecsPanel productId={props.productId} specs={props.specs} pending={pending} call={call} />
                    ),
                },
                {
                    id: "settings",
                    label: "Settings",
                    content: <SettingsPanel {...props} blockerTotal={blockerTotal} pending={pending} call={call} />,
                },
            ]}
        />
    )
}

/* ---------------------------------------------------------------------------------------- */

const FIELDS = [
    { key: "name", label: "Name", required: true },
    { key: "description", label: "Description", required: true },
    { key: "metaTitle", label: "Meta title", required: false },
    { key: "metaDescription", label: "Meta description", required: false },
] as const

/**
 * §13.2 item 7. English and Arabic side by side in one form, saved together.
 *
 * The Arabic column is `dir="rtl"` on the inputs themselves, not on a wrapper — the LABEL
 * stays left-to-right English because the admin chrome is English by design (CLAUDE.md), and
 * flipping the whole column would put an English label on the wrong side of its own field.
 *
 * Nothing here pre-fills Arabic from English. A missing field shows as missing.
 */
function TranslationEditor({
    productId,
    pair,
    pending,
    call,
}: {
    productId: string
    pair: TranslationPair
    pending: boolean
    call: (fn: () => Promise<ActionResult>) => void
}) {
    const [values, setValues] = useState<Record<"en" | "ar", TranslationFields>>({
        en: { ...pair.locales.en },
        ar: { ...pair.locales.ar },
    })

    const set = (locale: "en" | "ar", field: keyof TranslationFields, value: string) =>
        setValues((v) => ({ ...v, [locale]: { ...v[locale], [field]: value === "" ? null : value } }))

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                call(() => saveTranslations(productId, values))
            }}
            className="max-w-[720px] space-y-4"
        >
            {/*
             * BilingualField per property, English stacked above Arabic — not two columns.
             *
             * The side-by-side grid this replaces put "Name EN" beside "Name AR", then
             * "Description EN" beside "Description AR", so reading down the left-hand column
             * gave you the whole English record and the Arabic was a parallel document. That
             * is right for translating and wrong for EDITING, where the question is always
             * "do these two agree for THIS property" — a comparison the eye makes vertically
             * over 30px, not horizontally across a 600px gap.
             */}
            {FIELDS.map((field) => (
                <BilingualField
                    key={field.key}
                    label={field.label}
                    required={field.required ? "both" : "none"}
                    multiline={field.key === "description" || field.key === "metaDescription"}
                    rows={field.key === "description" ? 4 : 2}
                    en={{
                        value: values.en[field.key] ?? "",
                        onChange: (value) => set("en", field.key, value),
                        error:
                            field.required && !(values.en[field.key] ?? "").trim()
                                ? "Required in English."
                                : undefined,
                    }}
                    ar={{
                        value: values.ar[field.key] ?? "",
                        onChange: (value) => set("ar", field.key, value),
                        /*
                         * Named as its own consequence, not as a generic "missing". A product
                         * with no Arabic name renders as a gap on the Arabic storefront —
                         * saying so is the difference between a warning someone acts on and
                         * one they dismiss.
                         */
                        error:
                            field.required && !(values.ar[field.key] ?? "").trim()
                                ? "Required in Arabic. This renders as a gap on the Arabic storefront."
                                : undefined,
                    }}
                />
            ))}

            <Button type="submit" size="sm" disabled={pending} className="h-8 text-xs">
                {pending ? "Saving…" : "Save both languages"}
            </Button>
        </form>
    )
}

/* ---------------------------------------------------------------------------------------- */

/**
 * §13.2 item 3: stock is NEVER an editable number here.
 *
 * There is no "set on hand to 42" field, because the ledger is append-only and a field like
 * that would have to invent a movement to explain itself. You say what happened — found,
 * damaged, received — and the level follows.
 */
function InventoryPanel({
    productId,
    onHand,
    reserved,
    averageCost,
    movements,
    pending,
    call,
}: Props & { pending: boolean; call: (fn: () => Promise<ActionResult>) => void }) {
    const [adjustQty, setAdjustQty] = useState("")
    const [adjustReason, setAdjustReason] = useState("")
    const [damageQty, setDamageQty] = useState("")
    const [damageReason, setDamageReason] = useState("")
    const [receiveQty, setReceiveQty] = useState("")
    const [receiveCost, setReceiveCost] = useState("")

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "On hand", value: onHand },
                    { label: "Reserved", value: reserved },
                    { label: "Available", value: onHand - reserved },
                ].map((stat) => (
                    <div key={stat.label} className="bg-card rounded-lg border p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                    </div>
                ))}
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">Average cost</p>
                    <p className="text-2xl font-bold tabular-nums">
                        {averageCost ?? <span className="text-base font-normal text-muted-foreground">not recorded</span>}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <form
                    className="bg-card rounded-lg border p-4 shadow-sm space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault()
                        call(() => adjustStock(productId, Number(adjustQty), adjustReason))
                    }}
                >
                    <h3 className="font-semibold">Correction</h3>
                    <p className="text-xs text-muted-foreground">
                        Signed. <span className="font-mono">+3</span> found on a shelf,{" "}
                        <span className="font-mono">-2</span> miscounted.
                    </p>
                    <Input
                        aria-label="Adjustment quantity"
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)}
                        placeholder="+3"
                        inputMode="numeric"
                    />
                    {/* Required by the service signature, so required by the form. */}
                    <Input
                        aria-label="Adjustment reason"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Reason (required)"
                        required
                    />
                    <Button type="submit" variant="secondary" disabled={pending} className="w-full">
                        Record correction
                    </Button>
                </form>

                <form
                    className="bg-card rounded-lg border p-4 shadow-sm space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault()
                        call(() => recordDamage(productId, Number(damageQty), damageReason))
                    }}
                >
                    <h3 className="font-semibold">Damage or loss</h3>
                    <p className="text-xs text-muted-foreground">
                        Its own movement type, so it stays countable instead of hiding inside corrections.
                    </p>
                    <Input
                        aria-label="Damaged units"
                        value={damageQty}
                        onChange={(e) => setDamageQty(e.target.value)}
                        placeholder="Units lost"
                        inputMode="numeric"
                    />
                    <Input
                        aria-label="Damage reason"
                        value={damageReason}
                        onChange={(e) => setDamageReason(e.target.value)}
                        placeholder="Reason (required)"
                        required
                    />
                    <Button type="submit" variant="secondary" disabled={pending} className="w-full">
                        Record damage
                    </Button>
                </form>

                <form
                    className="bg-card rounded-lg border p-4 shadow-sm space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault()
                        call(() => receiveStock(productId, Number(receiveQty), receiveCost, "purchase receipt"))
                    }}
                >
                    <h3 className="font-semibold">Goods in</h3>
                    <p className="text-xs text-muted-foreground">
                        Unit cost is optional and blank means <em>not recorded</em> — never zero. It is what makes
                        margin reporting possible at all.
                    </p>
                    <Input
                        aria-label="Received units"
                        value={receiveQty}
                        onChange={(e) => setReceiveQty(e.target.value)}
                        placeholder="Units received"
                        inputMode="numeric"
                    />
                    <Input
                        aria-label="Unit cost"
                        value={receiveCost}
                        onChange={(e) => setReceiveCost(e.target.value)}
                        placeholder="Unit cost (optional)"
                        inputMode="decimal"
                    />
                    <Button type="submit" disabled={pending} className="w-full">
                        Receive stock
                    </Button>
                </form>
            </div>

            <section>
                <h3 className="font-semibold mb-3">Movement history</h3>
                <div className="overflow-x-auto border rounded-lg shadow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit cost</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No stock has moved yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="whitespace-nowrap tabular-nums">
                                            {new Date(m.createdAt).toLocaleString("en-GB")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{m.type.toLowerCase().replace(/_/g, " ")}</Badge>
                                        </TableCell>
                                        <TableCell
                                            className={`text-right tabular-nums font-medium ${m.quantity < 0 ? "text-red-600" : "text-green-600"}`}
                                        >
                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{m.unitCost ?? "—"}</TableCell>
                                        <TableCell className="max-w-xs truncate">{m.reason ?? "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">{m.actorType?.toLowerCase() ?? "—"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    )
}

/* ---------------------------------------------------------------------------------------- */

function PricePanel({
    productId,
    sku,
    price,
    averageCost,
    priceHistory,
    pending,
    call,
}: Props & { pending: boolean; call: (fn: () => Promise<ActionResult>) => void }) {
    const [next, setNext] = useState(price)
    const margin =
        averageCost && Number(averageCost) > 0
            ? (((Number(price) - Number(averageCost)) / Number(price)) * 100).toFixed(1)
            : null

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">Current price</p>
                    <p className="text-2xl font-bold tabular-nums">{price}</p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">Average cost</p>
                    <p className="text-2xl font-bold tabular-nums">{averageCost ?? "—"}</p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1">Gross margin</p>
                    {/* Not "0%". A margin with no recorded cost is unknown, and a zero here would
                        be read as a fact about the product rather than about the data. */}
                    <p className="text-2xl font-bold tabular-nums">
                        {margin ? `${margin}%` : <span className="text-base font-normal text-muted-foreground">cost not recorded</span>}
                    </p>
                </div>
            </div>

            <form
                className="bg-card rounded-lg border p-4 shadow-sm space-y-3 max-w-md"
                onSubmit={(e) => {
                    e.preventDefault()
                    call(() => setProductPrice(productId, next))
                }}
            >
                <h3 className="font-semibold">Change this price</h3>
                <p className="text-sm text-muted-foreground">
                    Saved through the same path as the bulk editor, so it appears in the history below with your name
                    on it. Orders already placed keep the price they were charged.
                </p>
                <div className="flex gap-2">
                    <Input
                        aria-label={`New price for ${sku}`}
                        inputMode="decimal"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className="tabular-nums"
                    />
                    {/*
                     * `consequential`, not `reversible`: this is money. §18 classifies by what
                     * an action DOES, not by how hard it is to undo — and the type then forces
                     * the dialog to state the count and the side effects rather than asking
                     * "are you sure?", which is a thing people click.
                     */}
                    <ConfirmAction
                        severity="consequential"
                        title={`Change ${sku} from ${price} to ${next}?`}
                        description="The storefront updates immediately."
                        confirmLabel="Change it"
                        impact={{
                            affectedCount: 1,
                            financialImpact: next,
                            sideEffects: [
                                `The listed price moves from ${price} to ${next}`,
                                "Orders already placed keep the price they recorded — this never rewrites what a customer was charged",
                                "The change is written to the audit trail with your name on it",
                            ],
                        }}
                        onConfirm={() => call(() => setProductPrice(productId, next))}
                    >
                        <Button
                            type="button"
                            size="sm"
                            disabled={pending || next === price || next.trim() === ""}
                            className="h-[30px] text-xs"
                        >
                            {pending ? "Saving…" : "Save"}
                        </Button>
                    </ConfirmAction>
                </div>
                <p className="text-xs text-muted-foreground">
                    Repricing a whole category at once is the{" "}
                    <Link href="/admin/products/pricing" className="underline underline-offset-4">
                        bulk editor
                    </Link>
                    .
                </p>
            </form>

            <section>
                <h3 className="font-semibold mb-3">Price history</h3>
                <div className="overflow-x-auto border rounded-lg shadow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>When</TableHead>
                                <TableHead className="text-right">From</TableHead>
                                <TableHead className="text-right">To</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {priceHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        This price has not been changed through the admin panel.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                priceHistory.map((row, i) => (
                                    <TableRow key={`${row.createdAt}-${i}`}>
                                        <TableCell className="whitespace-nowrap tabular-nums">
                                            {new Date(row.createdAt).toLocaleString("en-GB")}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{row.from}</TableCell>
                                        <TableCell className="text-right tabular-nums font-medium">{row.to}</TableCell>
                                        <TableCell className="text-muted-foreground">{row.actorEmail ?? "—"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    )
}

/* ---------------------------------------------------------------------------------------- */

/**
 * Editing specifications — the other half of "product details".
 *
 * Every spec the sub-category DECLARES appears, whether or not the product has a value, so a
 * missing one can be filled in rather than being invisible. A spec the product carries that
 * its sub-category does not declare appears too, marked, because hiding it is how it survives
 * forever.
 *
 * Clearing both boxes deletes the spec. An empty spec renders on the product page as a
 * labelled blank, which reads as missing data with extra steps.
 */
function SpecsPanel({
    productId,
    specs,
    pending,
    call,
}: {
    productId: string
    specs: SpecRow[]
    pending: boolean
    call: (fn: () => Promise<ActionResult>) => void
}) {
    const [values, setValues] = useState<Record<string, { valueEn: string; valueAr: string }>>(
        Object.fromEntries(specs.map((s) => [s.key, { valueEn: s.valueEn ?? "", valueAr: s.valueAr ?? "" }]))
    )

    const set = (key: string, field: "valueEn" | "valueAr", value: string) =>
        setValues((v) => ({ ...v, [key]: { ...(v[key] ?? { valueEn: "", valueAr: "" }), [field]: value } }))

    const dirty = specs.some(
        (spec) =>
            (values[spec.key]?.valueEn ?? "") !== (spec.valueEn ?? "") ||
            (values[spec.key]?.valueAr ?? "") !== (spec.valueAr ?? "")
    )

    if (specs.length === 0) {
        return (
            <p className="text-muted-foreground">
                This product&rsquo;s sub-category declares no specifications, and the product carries none.
            </p>
        )
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                call(() =>
                    saveProductSpecs(
                        productId,
                        specs.map((spec) => ({
                            key: spec.key,
                            valueEn: values[spec.key]?.valueEn ?? "",
                            valueAr: values[spec.key]?.valueAr ?? "",
                        }))
                    )
                )
            }}
            className="space-y-4"
        >
            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending || !dirty}>
                    {pending ? "Saving…" : dirty ? "Save specifications" : "Saved"}
                </Button>
                <span className="text-sm text-muted-foreground">
                    Clearing both boxes removes the specification. Numbers, ranges and &ldquo;-&rdquo; are all accepted
                    as typed.
                </span>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-64">Specification</TableHead>
                            <TableHead>English</TableHead>
                            <TableHead>Arabic</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {specs.map((spec) => (
                            <TableRow key={spec.key}>
                                <TableCell className="align-top">
                                    <div className="font-medium">
                                        {spec.labelEn}
                                        {spec.unitEn ? (
                                            <span className="text-muted-foreground"> ({spec.unitEn})</span>
                                        ) : null}
                                    </div>
                                    <div className="text-sm text-muted-foreground" dir="rtl">
                                        {spec.labelAr}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {spec.required && <Badge variant="secondary">required</Badge>}
                                        {!spec.declared && <Badge variant="outline">not declared here</Badge>}
                                        {/* N4, carried across from v1 and shown rather than repaired. */}
                                        {spec.typeMismatch && (
                                            <Badge variant="destructive">stored as a boolean</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label={`${spec.labelEn} in English`}
                                        value={values[spec.key]?.valueEn ?? ""}
                                        onChange={(e) => set(spec.key, "valueEn", e.target.value)}
                                        className={spec.valueType === "NUMBER" ? "tabular-nums" : undefined}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        aria-label={`${spec.labelEn} in Arabic`}
                                        dir="rtl"
                                        value={values[spec.key]?.valueAr ?? ""}
                                        onChange={(e) => set(spec.key, "valueAr", e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </form>
    )
}

/* ---------------------------------------------------------------------------------------- */

function SettingsPanel({
    productId,
    slug,
    isActive,
    isArchived,
    blockers,
    blockerTotal,
    slugHistory,
    pending,
    call,
}: Props & { blockerTotal: number; pending: boolean; call: (fn: () => Promise<ActionResult>) => void }) {
    const [nextSlug, setNextSlug] = useState(slug)

    return (
        <div className="space-y-8 max-w-3xl">
            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-3">
                <h3 className="font-semibold">Storefront visibility</h3>
                <p className="text-sm text-muted-foreground">
                    Hiding is instant and reversible. It does not archive the product or touch any order.
                </p>
                <Button
                    variant={isActive ? "secondary" : "default"}
                    disabled={pending || isArchived}
                    onClick={() => call(() => setProductActive(productId, !isActive))}
                >
                    {isActive ? "Hide from storefront" : "Show on storefront"}
                </Button>
                {isArchived && (
                    <p className="text-sm text-muted-foreground">Archived products cannot be shown; restore it first.</p>
                )}
            </section>

            <form
                className="bg-card rounded-lg border p-4 shadow-sm space-y-3"
                onSubmit={(e) => {
                    e.preventDefault()
                    call(() => renameProduct(productId, nextSlug))
                }}
            >
                <h3 className="font-semibold">URL</h3>
                <p className="text-sm text-muted-foreground">
                    The old address keeps working — renaming writes a redirect in the same transaction.
                </p>
                <Input value={nextSlug} onChange={(e) => setNextSlug(e.target.value)} aria-label="Product slug" />
                <Button type="submit" variant="secondary" disabled={pending || nextSlug === slug}>
                    Rename
                </Button>
                {slugHistory.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Redirecting here: {slugHistory.map((s) => `/${s}`).join(", ")}
                    </p>
                )}
            </form>

            <section className="rounded-lg border border-destructive/40 p-4 space-y-4">
                <h3 className="font-semibold text-destructive">Removal</h3>

                {isArchived ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">This product is archived.</p>
                        <Button variant="secondary" disabled={pending} onClick={() => call(() => restoreProduct(productId))}>
                            Restore
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Archiving hides it everywhere and keeps every order that mentions it readable. This is the
                            normal way to remove a product.
                        </p>
                        <ConfirmAction
                            severity="reversible"
                            title="Archive this product?"
                            description="It disappears from the storefront immediately. Nothing is destroyed and you can restore it from this page."
                            confirmLabel="Archive"
                            onConfirm={() => call(() => softDeleteProduct(productId))}
                        >
                            <Button variant="secondary" size="sm" disabled={pending} className="h-7 text-xs">
                                Archive
                            </Button>
                        </ConfirmAction>
                    </div>
                )}

                <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                        Permanent deletion removes the row. It is only possible while nothing refers to it.
                    </p>
                    {/*
                     * One confirmation primitive, and the severity carries the difference.
                     *
                     * This was a plain button behind a two-line dialog with no typed
                     * confirmation — one mis-aimed click from destroying a product row, its
                     * translations, images and specs. `severity="destructive"` makes
                     * `typeToConfirm` a COMPILE-TIME requirement, so the guard cannot be
                     * forgotten here or on the next destructive action anybody writes.
                     *
                     * The blockers moved inside the dialog as well. They were a paragraph
                     * beside a button that simply was not rendered, which answered "why can I
                     * not delete this" only for someone who already knew to look for it.
                     */}
                    <ConfirmAction
                        severity="destructive"
                        title={`Delete ${slug} permanently?`}
                        description="This cannot be undone. The product row, its translations, images and specs are removed. An audit entry records what was destroyed."
                        confirmLabel="Delete permanently"
                        typeToConfirm={slug}
                        blockedBy={
                            blockerTotal > 0
                                ? {
                                      reason: "Other records still refer to this product.",
                                      counts: [
                                          { label: "Order lines", count: blockers.orderItems },
                                          { label: "Cart items", count: blockers.cartItems },
                                          { label: "Configurations", count: blockers.configurations },
                                      ].filter((entry) => entry.count > 0),
                                  }
                                : undefined
                        }
                        impact={{
                            affectedCount: 1,
                            sideEffects: [
                                "Translations, images and specifications are removed with it",
                                "An audit entry records what was destroyed",
                            ],
                        }}
                        onConfirm={() => call(() => hardDeleteProduct(productId))}
                    >
                        <Button variant="destructive" size="sm" disabled={pending} className="h-7 text-xs">
                            Delete permanently
                        </Button>
                    </ConfirmAction>
                </div>
            </section>
        </div>
    )
}
