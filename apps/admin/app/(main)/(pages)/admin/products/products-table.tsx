"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import Image from "@/components/app-image"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CellIdentity, CellText } from "@/components/data-table/cell-text"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar, type FilterDef } from "@/components/data-table/toolbar"
import { Money } from "@/components/money"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { deriveStockState } from "@/lib/status"
import type { ProductListResult, ProductRow } from "@/lib/services/product-list-service"
import type { TableState } from "@/lib/table-params"

/**
 * Reference screen 1 (P4.5 §23).
 *
 * Not a mockup: real primitives, the branch database, 189 products. It exists to prove the
 * DataTable contract under the conditions that break tables — Arabic names, missing cost,
 * zero stock, 200-row pages — before nineteen other surfaces are built on it.
 */

interface Props extends ProductListResult {
    state: TableState
}

export function ProductsTable({ rows, total, openingCountPending, facets, state }: Props) {
    const router = useRouter()
    const [hidden, setHidden] = useState<Record<string, boolean>>({ family: true, createdAt: true })

    const columns = useMemo<ColumnDef<ProductRow, unknown>[]>(
        () => [
            {
                id: "name",
                header: "Product",
                cell: ({ row }) => (
                    <div className="flex min-w-0 items-center gap-2">
                        {row.original.imageUrl ? (
                            <Image
                                src={row.original.imageUrl}
                                alt=""
                                width={20}
                                height={20}
                                className="size-5 shrink-0 rounded-sm border bg-card object-contain"
                            />
                        ) : (
                            /* A missing photograph is information on a lighting catalogue —
                               the product cannot be published — so the slot stays, marked. */
                            <span
                                title="No photograph"
                                className="grid size-5 shrink-0 place-items-center rounded-sm border border-dashed text-2xs text-muted-foreground"
                            >
                                —
                            </span>
                        )}
                        <CellIdentity
                            name={row.original.nameEn ?? row.original.sku}
                            identifier={row.original.sku}
                        />
                    </div>
                ),
            },
            {
                id: "nameAr",
                header: "Arabic name",
                cell: ({ row }) =>
                    row.original.nameAr ? (
                        <CellText lang="ar" className="font-arabic">
                            {row.original.nameAr}
                        </CellText>
                    ) : (
                        /* Not blank, and not the English name. §16: missing Arabic is missing. */
                        <StatusBadge kind="translation" value="en_only" />
                    ),
            },
            {
                id: "subCategory",
                header: "Category",
                /*
                 * One line, not two. Stacking the sub-category over its parent category
                 * added 14px to every row for a value that is already a filter above the
                 * table — and the parent is the same for long runs of rows, so it repeats
                 * itself down the column while costing four visible rows a screen.
                 */
                cell: ({ row }) => (
                    <CellText title={[row.original.category, row.original.subCategory].filter(Boolean).join(" › ")}>
                        {row.original.subCategory ?? "—"}
                    </CellText>
                ),
            },
            {
                id: "family",
                header: "Family",
                cell: ({ row }) => <CellText className="font-mono text-2xs">{row.original.family ?? "—"}</CellText>,
            },
            {
                id: "price",
                header: "Price",
                meta: { numeric: true },
                cell: ({ row }) => <Money value={row.original.price} />,
            },
            {
                id: "cost",
                header: "Cost",
                meta: { numeric: true },
                cell: ({ row }) => <Money value={row.original.averageCost} />,
            },
            {
                id: "stock",
                header: "Stock",
                meta: { numeric: true },
                cell: ({ row }) => {
                    const available = row.original.onHand - row.original.reserved
                    return (
                        <span className="tabular-nums">
                            {available}
                            {row.original.reserved > 0 && (
                                <span className="ml-1 text-2xs text-muted-foreground">
                                    ({row.original.reserved} res)
                                </span>
                            )}
                        </span>
                    )
                },
            },
            {
                id: "stockState",
                header: "Stock state",
                cell: ({ row }) => (
                    <StatusBadge
                        kind="stock"
                        value={deriveStockState({
                            onHand: row.original.onHand,
                            reserved: row.original.reserved,
                            openingCountPending,
                        })}
                    />
                ),
            },
            {
                id: "status",
                header: "Status",
                cell: ({ row }) =>
                    row.original.isActive ? (
                        <StatusBadge kind="quality" value="ok" />
                    ) : (
                        <span className="inline-flex w-fit items-center rounded-md border border-neutral-border bg-neutral-bg px-1.5 py-0.5 text-2xs font-medium text-neutral">
                            Hidden
                        </span>
                    ),
            },
            {
                id: "createdAt",
                header: "Added",
                cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">
                        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                    </span>
                ),
            },
        ],
        [openingCountPending]
    )

    const filters: FilterDef[] = useMemo(
        () => [
            { key: "category", label: "Category", options: facets.categories, width: "w-44" },
            { key: "subCategory", label: "Sub-category", options: facets.subCategories, width: "w-44" },
            {
                key: "stock",
                label: "Stock",
                options: [
                    { value: "in", label: "In stock" },
                    { value: "out", label: "Out of stock" },
                ],
                width: "w-36",
            },
            {
                key: "translation",
                label: "Translation",
                options: [
                    { value: "complete", label: "Complete" },
                    { value: "en_only", label: "English only" },
                    { value: "ar_only", label: "Arabic only" },
                ],
                width: "w-40",
            },
            {
                key: "cost",
                label: "Cost",
                options: [
                    { value: "missing", label: "Not recorded" },
                    { value: "recorded", label: "Recorded" },
                ],
                width: "w-36",
            },
            {
                key: "status",
                label: "Status",
                options: [
                    { value: "active", label: "Active" },
                    { value: "hidden", label: "Hidden" },
                    { value: "featured", label: "Featured" },
                ],
                width: "w-32",
            },
        ],
        [facets]
    )

    const visibleColumns = columns
        .filter((column) => column.id !== "__select")
        .map((column) => ({
            id: column.id!,
            label: String(column.header),
            visible: !hidden[column.id!],
            toggle: () => setHidden((current) => ({ ...current, [column.id!]: !current[column.id!] })),
        }))

    const shown = useMemo(
        () => columns.filter((column) => !hidden[column.id!]),
        [columns, hidden]
    )

    return (
        <DataTable<ProductRow>
            caption={`Products, ${total} total`}
            columns={shown}
            data={rows}
            rowCount={total}
            state={state}
            getRowId={(row) => row.sku}
            sortableColumns={["name", "price", "stock", "createdAt"]}
            onRowOpen={(row) => router.push(`/admin/products/${row.id}`)}
            filtered={Object.keys(state.filters).length > 0}
            selection={{
                bulkActions: [
                    {
                        id: "export",
                        label: "Export CSV",
                        run: (selected) => exportCsv(selected),
                    },
                ],
            }}
            toolbar={
                <DataTableToolbar
                    searchPlaceholder="SKU or name, either language…"
                    filters={filters}
                    columns={visibleColumns}
                    actions={
                        <>
                            <Button asChild variant="outline" className="text-xs">
                                <Link href="/admin/products/pricing">Bulk pricing</Link>
                            </Button>
                            {/* Beside repricing, because the question "can I put this on
                                offer?" is asked from this screen and the answer used to be
                                "reprice it and remember to reprice it back". */}
                            <Button asChild variant="outline" className="text-xs">
                                <Link href="/admin/products/discounts">Discounts</Link>
                            </Button>
                            <Button asChild className="text-xs">
                                <Link href="/admin/products/new">New product</Link>
                            </Button>
                        </>
                    }
                />
            }
            emptyState={{
                noData: {
                    variant: "no-data",
                    title: "No products yet",
                    description: "The catalogue is empty. Create the first product to begin.",
                },
                noResults: {
                    variant: "no-results",
                    title: "No products match these filters",
                    description: "Clear a filter or widen the search to see more.",
                },
            }}
        />
    )
}

/**
 * CSV of the selected rows. No dependency: a Blob and a string.
 *
 * `xlsx` is already installed and is deliberately not used — the version in the tree is the
 * abandoned npm build carrying two unfixed CVEs. The BOM is not decoration: without it Excel
 * reads the Arabic column as mojibake.
 */
function exportCsv(rows: ProductRow[]) {
    const headers = ["SKU", "Name (EN)", "Name (AR)", "Category", "Price", "Cost", "On hand", "Reserved", "Active"]
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`

    const body = rows.map((row) =>
        [
            row.sku,
            row.nameEn ?? "",
            row.nameAr ?? "",
            row.subCategory ?? "",
            row.price,
            row.averageCost ?? "Not recorded",
            row.onHand,
            row.reserved,
            row.isActive ? "Yes" : "No",
        ]
            .map(escape)
            .join(",")
    )

    const csv = `﻿${[headers.map(escape).join(","), ...body].join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
