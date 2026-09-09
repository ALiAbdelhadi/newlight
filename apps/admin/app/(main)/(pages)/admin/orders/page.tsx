import { requireCurrentAdmin } from "@/lib/auth"
import { listOrders } from "@/lib/services/order-list-service"
import { parseTableState } from "@/lib/table-params"
import { OrdersTable } from "./orders-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Orders (P4.5 §11).
 *
 * Server component, URL-driven, one row per order. What it replaces fetched every order in
 * the database with every line item, every line's product, every product's translations and
 * every configuration — unbounded — on each render, and then searched the result in the
 * browser.
 */
export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    await requireCurrentAdmin()

    const state = parseTableState(await searchParams, { sort: "createdAt", dir: "desc" })
    const result = await listOrders(state)

    return (
        <div className="flex h-full flex-col">
            <OrdersTable {...result} state={state} />
        </div>
    )
}
