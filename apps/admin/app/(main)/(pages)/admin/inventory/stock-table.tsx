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

interface Props {
    rows: StockRow[]
    total: number
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
