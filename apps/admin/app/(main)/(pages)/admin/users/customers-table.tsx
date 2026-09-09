"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { CellIdentity, CellText } from "@/components/data-table/cell-text"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar, type FilterDef } from "@/components/data-table/toolbar"
import { Money } from "@/components/money"
import type { CustomerListResult, CustomerRow } from "@/lib/services/customer-list-service"
import type { TableState } from "@/lib/table-params"

/**
 * Customers, on the list archetype (P4.5 §11).
 *
 * The screen this replaces was a `Card` wrapping a `Card` wrapping a table, under a masthead
 * that said "Customers", above a heading that said "All Customers", above a card title that
 * said "Customers". Three labels, one list. It also had a search box that filtered an array
 * in the browser and a "Loading…" row that could never be seen, because the filter it was
 * waiting for was synchronous.
 *
 * The columns are chosen for the question this surface actually answers — who is worth
 * calling back. Lifetime spend and last order are that; a truncated cuid and a full postal
 * address were not, and the address is now one line (city) with the rest on the record.
 */

interface Props extends CustomerListResult {
    state: TableState
}

export function CustomersTable({ rows, total, state }: Props) {
    const router = useRouter()
    const [hidden, setHidden] = useState<Record<string, boolean>>({ address: true })

    const columns = useMemo<ColumnDef<CustomerRow, unknown>[]>(
        () => [
            {
                id: "name",
                header: "Customer",
                cell: ({ row }) => <CellIdentity name={row.original.name} identifier={row.original.email} />,
            },
            {
                id: "phone",
                header: "Phone",
                cell: ({ row }) => (
                    <CellText className="font-mono text-2xs">{row.original.phone ?? "—"}</CellText>
                ),
            },
            {
                id: "city",
                header: "City",
                cell: ({ row }) =>
                    row.original.city ? (
                        <CellText>{row.original.city}</CellText>
                    ) : (
                        /* No address is an operational fact, not a blank: this customer cannot
                           be shipped to until one is captured. */
                        <span className="text-2xs text-muted-foreground">No address</span>
                    ),
            },
            {
                id: "address",
                header: "Address",
                cell: ({ row }) => <CellText>{row.original.address ?? "—"}</CellText>,
            },
            {
                id: "orders",
                header: "Orders",
                meta: { numeric: true },
                cell: ({ row }) => <span className="tabular-nums">{row.original.orders}</span>,
            },
            {
                id: "spend",
                header: "Lifetime spend",
                meta: { numeric: true },
                cell: ({ row }) => <Money value={row.original.spend} />,
            },
            {
                id: "lastOrderAt",
                header: "Last order",
                cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">
                        {row.original.lastOrderAt ? formatDate(row.original.lastOrderAt) : "never"}
                    </span>
                ),
            },
            {
                id: "createdAt",
                header: "Joined",
                cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">{formatDate(row.original.createdAt)}</span>
                ),
            },
        ],
        []
    )

    const filters: FilterDef[] = useMemo(
        () => [
            {
                key: "orders",
                label: "Orders",
                options: [
                    { value: "with", label: "Has ordered" },
                    { value: "without", label: "Never ordered" },
                ],
                width: "w-40",
            },
            {
                key: "address",
                label: "Address",
                options: [{ value: "missing", label: "No address" }],
                width: "w-36",
            },
        ],
        []
    )

    const visibleColumns = columns
        .filter((column) => column.id !== "__select")
        .map((column) => ({
            id: column.id!,
            label: String(column.header),
            visible: !hidden[column.id!],
            toggle: () => setHidden((current) => ({ ...current, [column.id!]: !current[column.id!] })),
        }))

    const shown = useMemo(() => columns.filter((column) => !hidden[column.id!]), [columns, hidden])

    return (
        <DataTable<CustomerRow>
            caption={`Customers, ${total} total`}
            columns={shown}
            data={rows}
            rowCount={total}
            state={state}
            getRowId={(row) => row.email}
            /*
             * `spend` is absent on purpose: it is summed after paging, so a header that
             * offered to sort by it would be offering to sort fifty rows and call the result
             * an answer about every customer.
             */
            sortableColumns={["name", "orders", "createdAt"]}
            onRowOpen={(row) => router.push(`/admin/users/${row.id}`)}
            filtered={Object.keys(state.filters).length > 0}
            toolbar={
                <DataTableToolbar
                    searchPlaceholder="Name, email, phone or city…"
                    filters={filters}
                    columns={visibleColumns}
                />
            }
            emptyState={{
                noData: {
                    variant: "no-data",
                    title: "No customers yet",
                    description: "A customer record is created the first time somebody signs in on the storefront.",
                },
                noResults: {
                    variant: "no-results",
                    title: "No customers match these filters",
                    description: "Clear a filter or widen the search to see more.",
                },
            }}
        />
    )
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
