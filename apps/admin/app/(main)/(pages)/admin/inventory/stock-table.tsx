"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { CellIdentity } from "@/components/data-table/cell-text"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar, type FilterDef } from "@/components/data-table/toolbar"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { deriveStockState } from "@/lib/status"
import type { StockRow } from "@/lib/services/inventory-service"
import type { TableState } from "@/lib/table-params"

/**
 * The stock list — every product, not just the ones running out.
 *
 * This screen used to hold a single hard-coded `lowStock(10)` table, which meant the only
 * question it could answer was "what is nearly gone". An operator doing a stocktake, costing
 * a catalogue, or looking up one SKU had no list to look at: the products that are FINE were
 * unreachable from the page named Inventory.
 *
 * "Low stock" is now one option in a filter, not the whole table, and the default view is
 * every product sorted by available ascending — so the low-stock readout the page had before
 * is still the first thing on screen, with the rest of the catalogue underneath it instead of
 * missing.
 *
 * Built on DataTable rather than on a second hand-rolled table (§11): filters, sort, page and
 * density live in the URL, so "the out-of-stock SKUs" is a link somebody can paste into a
 * message, and the count under the table is the database's count over the same predicate —
 * never the length of the page.
 */

interface Props {
    rows: StockRow[]
    total: number
    /** Installation-wide (N1). While set, every level is an unverified opening balance. */
    openingCountPending: boolean
    state: TableState
}

export function StockTable({ rows, total, openingCountPending, state }: Props) {
    const router = useRouter()

    const columns = useMemo<ColumnDef<StockRow, unknown>[]>(
        () => [
            {
                id: "name",
                header: "Product",
                cell: ({ row }) => <CellIdentity name={row.original.name ?? row.original.sku} identifier={row.original.sku} />,
            },
            {
                id: "state",
                header: "State",
                cell: ({ row }) => (
                    /*
                     * The badge derives its state from the same `onHand - reserved` the SQL
                     * filter compares, through `deriveStockState` — so filtering to "Low"
                     * cannot return a row the badge calls something else.
                     */
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
                id: "onHand",
                header: "On hand",
                meta: { numeric: true },
                cell: ({ row }) => <span>{row.original.onHand}</span>,
            },
            {
                id: "reserved",
                header: "Reserved",
                meta: { numeric: true },
                cell: ({ row }) =>
                    row.original.reserved > 0 ? (
                        <span>{row.original.reserved}</span>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    ),
            },
            {
                id: "available",
                header: "Available",
                meta: { numeric: true },
                /*
                 * The number a buyer can actually have, and the only one worth acting on.
                 * A negative available is a ledger fault rather than a low level, so it is
                 * carried by the badge column's "Out" plus this figure, not by red text.
                 */
                cell: ({ row }) => (
                    <span className={row.original.available <= 0 ? "text-muted-foreground" : "font-medium"}>
                        {row.original.available}
                    </span>
                ),
            },
            {
                id: "cost",
                header: "Unit cost",
                cell: ({ row }) =>
                    row.original.hasCost ? (
                        <span className="text-xs text-muted-foreground">recorded</span>
                    ) : (
                        /*
                         * Not zero, and worded exactly as the bulk-cost form below words it
                         * — the same fact should not be "none" in one half of the page and
                         * something else in the other. A missing cost is why valuation and
                         * margin refuse a number at the top of this page, so it is listed.
                         */
                        <Badge variant="secondary">none</Badge>
                    ),
            },
            {
                id: "status",
                header: "Storefront",
                cell: ({ row }) =>
                    row.original.isActive ? (
                        <span className="text-xs text-muted-foreground">Visible</span>
                    ) : (
                        /* A hidden product still occupies shelf space and still has to be
                           counted, so it is listed — and marked, not silently mixed in. */
                        <span className="inline-flex w-fit items-center rounded-md border border-neutral-border bg-neutral-bg px-1.5 py-0.5 text-2xs font-medium text-neutral">
                            Hidden
                        </span>
                    ),
            },
        ],
        [openingCountPending]
    )

    const filters: FilterDef[] = useMemo(
        () => [
            {
                key: "filter",
                label: "Stock",
                options: [
                    { value: "low", label: "Low" },
                    { value: "out", label: "Out" },
                    { value: "reserved", label: "Fully reserved" },
                    { value: "in_stock", label: "In stock" },
                    { value: "negative", label: "Negative (ledger fault)" },
                ],
                width: "w-44",
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
                label: "Storefront",
                options: [
                    { value: "active", label: "Visible" },
                    { value: "hidden", label: "Hidden" },
                ],
                width: "w-32",
            },
        ],
        []
    )

    return (
        <DataTable<StockRow>
            caption={`Stock levels, ${total} products`}
            columns={columns}
            data={rows}
            rowCount={total}
            state={state}
            getRowId={(row) => row.sku}
            sortableColumns={["name", "onHand", "reserved", "available"]}
            /* Straight to the product's ledger: the only place stock can legally be changed
               is a movement with a reason, and that is what the inventory tab holds. */
            onRowOpen={(row) => router.push(`/admin/products/${row.productId}?tab=inventory`)}
            filtered={Object.keys(state.filters).length > 0}
            selection={{
                bulkActions: [{ id: "export", label: "Export CSV", run: (selected) => exportCsv(selected) }],
            }}
            toolbar={
                <DataTableToolbar
                    searchPlaceholder="SKU or name, either language…"
                    filters={filters}
                    actions={
                        <Button asChild variant="outline" className="text-xs">
                            <a href="#bulk-cost-entry">Record receipts</a>
                        </Button>
                    }
                />
            }
            emptyState={{
                noData: {
                    variant: "no-data",
                    title: "No products yet",
                    description: "Stock levels appear here once the catalogue has products in it.",
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
 * A count sheet for the selected rows. No dependency: a Blob and a string.
 *
 * The BOM is not decoration — without it Excel reads an Arabic product name as mojibake, and
 * a stocktake sheet nobody can read the names on is not a stocktake sheet.
 */
function exportCsv(rows: StockRow[]) {
    const headers = ["SKU", "Name", "On hand", "Reserved", "Available", "Unit cost", "Storefront", "Counted"]
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`

    const body = rows.map((row) =>
        [
            row.sku,
            row.name ?? "",
            row.onHand,
            row.reserved,
            row.available,
            row.hasCost ? "Recorded" : "Not recorded",
            row.isActive ? "Visible" : "Hidden",
            // Deliberately empty: the sheet is printed and written on.
            "",
        ]
            .map(escape)
            .join(",")
    )

    const csv = `﻿${[headers.map(escape).join(","), ...body].join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
