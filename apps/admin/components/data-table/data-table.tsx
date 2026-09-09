"use client"

import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type RowSelectionState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { EmptyState, type EmptyStateProps } from "@/components/states"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTablePagination } from "@/components/data-table/pagination"
import { DataTableSkeleton } from "@/components/data-table/skeleton"
import { useTableKeyboard } from "@/components/data-table/use-table-keyboard"
import { ariaSortFor, buildTableQuery, nextSort, type TableState } from "@/lib/table-params"
import { cn } from "@/lib/utils"

export interface BulkAction<T> {
    id: string
    label: string
    tone?: "default" | "danger"
    run: (rows: T[]) => void
}

export interface DataTableProps<T> {
    columns: ColumnDef<T, unknown>[]
    data: T[]
    rowCount: number
    state: TableState
    getRowId: (row: T) => string
    sortableColumns?: string[]
    onRowOpen?: (row: T) => void
    selection?: { bulkActions: BulkAction<T>[] }
    emptyState: { noData: EmptyStateProps; noResults: EmptyStateProps }
    toolbar?: React.ReactNode
    filtered?: boolean
    loading?: boolean
    caption: string
}

const ROW_HEIGHT: Record<TableState["density"], string> = {
    compact: "h-[34px]",
    comfortable: "h-[44px]",
    dense: "h-[28px]",
}

const CELL_PADDING: Record<TableState["density"], string> = {
    compact: "px-2.5 py-1.5",
    comfortable: "px-2.5 py-2.5",
    dense: "px-2 py-1",
}

export function DataTable<T>({
    columns,
    data,
    rowCount,
    state,
    getRowId,
    sortableColumns = [],
    onRowOpen,
    selection,
    emptyState,
    toolbar,
    filtered = false,
    loading = false,
    caption,
}: DataTableProps<T>) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

    const selectableColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
        if (!selection) return columns
        return [
            {
                id: "__select",
                size: 32,
                enableHiding: false,
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all rows on this page"
                        className="size-3.5"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={`Select ${getRowId(row.original)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="size-3.5"
                    />
                ),
            },
            ...columns,
        ]
    }, [columns, selection, getRowId])

    const table = useReactTable({
        data,
        columns: selectableColumns,
        getRowId: (row) => getRowId(row),
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        rowCount,
        enableRowSelection: !!selection,
        state: { rowSelection, columnVisibility },
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
    })

    const push = useCallback(
        (patch: Record<string, string | number | null>) => {
            router.push(`${pathname}${buildTableQuery(new URLSearchParams(searchParams.toString()), patch)}`, {
                scroll: false,
            })
        },
        [router, pathname, searchParams]
    )

    const toggleSort = useCallback(
        (column: string) => {
            const next = nextSort(state, column)
            push({ sort: next.sort, dir: next.dir })
        },
        [state, push]
    )

    const rows = table.getRowModel().rows
    const { cursor, containerProps } = useTableKeyboard({
        rowCount: rows.length,
        onOpen: (index) => {
            const row = rows[index]
            if (row && onRowOpen) onRowOpen(row.original)
        },
        onToggleSelect: (index) => rows[index]?.toggleSelected(),
        enabled: !loading,
    })

    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
    const columnCount = table.getVisibleFlatColumns().length

    return (
        <div className="flex min-h-0 flex-col">
            {toolbar}

            {selection && selectedRows.length > 0 && (
                <BulkBar
                    count={selectedRows.length}
                    actions={selection.bulkActions}
                    rows={selectedRows}
                    onClear={() => setRowSelection({})}
                />
            )}

            <div className="overflow-x-auto border-y">
                <table className="w-full border-collapse text-left" {...containerProps}>
                    <caption className="sr-only">{caption}</caption>

                    <thead className="sticky top-0 z-10 bg-surface-sunk">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="h-8 border-b border-border-strong">
                                {headerGroup.headers.map((header) => {
                                    const sortable = sortableColumns.includes(header.column.id)
                                    const sorted = state.sort === header.column.id
                                    return (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            aria-sort={sortable ? ariaSortFor(state, header.column.id) : undefined}
                                            style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}
                                            className={cn(
                                                "text-xs font-medium whitespace-nowrap text-muted-foreground",
                                                CELL_PADDING[state.density],
                                                "py-0"
                                            )}
                                        >
                                            {header.isPlaceholder ? null : sortable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort(header.column.id)}
                                                    className="flex items-center gap-1 rounded-sm transition-colors duration-(--duration-fast) hover:text-foreground"
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {sorted ? (
                                                        state.dir === "asc" ? (
                                                            <ArrowUp aria-hidden className="size-3 text-foreground" />
                                                        ) : (
                                                            <ArrowDown aria-hidden className="size-3 text-foreground" />
                                                        )
                                                    ) : (
                                                        <ChevronsUpDown
                                                            aria-hidden
                                                            className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
                                                        />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )}
                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {loading ? (
                            <DataTableSkeleton
                                columns={columnCount}
                                rows={Math.min(state.pageSize, 12)}
                                density={state.density}
                            />
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount}>
                                    <EmptyState {...(filtered ? emptyState.noResults : emptyState.noData)} />
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                    data-cursor={cursor === index ? "" : undefined}
                                    onClick={() => onRowOpen?.(row.original)}
                                    className={cn(
                                        ROW_HEIGHT[state.density],
                                        "border-b transition-colors duration-(--duration-fast)",
                                        "hover:bg-accent/50",
                                        row.getIsSelected() && "bg-primary-soft",
                                        cursor === index && "outline-2 -outline-offset-2 outline-ring",
                                        onRowOpen && "cursor-pointer"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={cn(
                                                "align-middle text-sm",
                                                CELL_PADDING[state.density],
                                                (cell.column.columnDef.meta as { numeric?: boolean } | undefined)
                                                    ?.numeric && "text-right tabular-nums"
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DataTablePagination state={state} total={rowCount} onChange={push} />
        </div>
    )
}

function BulkBar<T>({
    count,
    actions,
    rows,
    onClear,
}: {
    count: number
    actions: BulkAction<T>[]
    rows: T[]
    onClear: () => void
}) {
    return (
        <div
            aria-live="polite"
            className="flex h-10 items-center gap-2 border-t bg-primary-soft px-3 text-xs"
        >
            <span className="font-medium tabular-nums">{count} selected</span>
            <button
                type="button"
                onClick={onClear}
                className="text-muted-foreground underline-offset-2 hover:underline"
            >
                Clear
            </button>
            <div className="ml-auto flex items-center gap-1.5">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        onClick={() => action.run(rows)}
                        className={cn(
                            "h-7 rounded-md border px-2 transition-colors duration-(--duration-fast)",
                            action.tone === "danger"
                                ? "border-danger-border bg-danger-bg text-danger hover:bg-danger-bg/70"
                                : "border-border-strong bg-card hover:bg-accent"
                        )}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
