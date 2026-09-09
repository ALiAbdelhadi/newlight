import { requireCurrentAdmin } from "@/lib/auth"
import { listCustomers } from "@/lib/services/customer-list-service"
import { parseTableState } from "@/lib/table-params"
import { CustomersTable } from "./customers-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Customers (P4.5 §11).
 *
 * A server component that reads the URL and queries, the same shape as Products. What it
 * replaces fetched EVERY user with EVERY order each of them had placed — no `take`, no
 * `where` — handed the lot to a client component, and filtered it there. The search box
 * therefore searched one page of an unpaged list, and `Prisma.Decimal` crossed the
 * server/client boundary on every row.
 *
 * The role filter is new and deliberate: administrators have their own surface, and an
 * operator looking for a customer should not have to skip past their colleagues.
 */
export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    await requireCurrentAdmin()

    const state = parseTableState(await searchParams, { sort: "createdAt", dir: "desc" })
    const result = await listCustomers(state)

    return (
        <div className="flex h-full flex-col">
            <CustomersTable {...result} state={state} />
        </div>
    )
}
