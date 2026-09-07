import { requireCurrentAdmin } from "@/lib/auth"
import { listProducts } from "@/lib/services/product-list-service"
import { parseTableState } from "@/lib/table-params"
import { ProductsTable } from "./products-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Products (P4.5 §23, Reference screen 1).
 *
 * A server component that reads the URL and queries. There is no client fetch and no loading
 * flash, because the filtered result IS the page.
 *
 * Three defects in what this replaces, all of which the rewrite removes rather than papers
 * over:
 *
 *   THE "SOLD" TAB LIED. It filtered the fifty rows already fetched and then printed
 *   "Products with Sales" and "Total Units Sold" from that slice, under a comment asserting
 *   the counts described the catalogue. On page 1 of 4 it was wrong by construction.
 *
 *   IT LOADED EVERY ORDER LINE. `orderItems: { select: { quantity: true } }` pulled the full
 *   order history of all fifty products on every render, to compute two numbers nobody could
 *   act on.
 *
 *   THREE STAT CARDS OCCUPIED THE FIRST SCREEN. 189 / 0 / 0 in 32px type, above the fold, on
 *   a surface whose job is showing rows. They are gone; the count lives in the pagination
 *   footer, where it is read against the rows it counts.
 */
export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    await requireCurrentAdmin()

    const state = parseTableState(await searchParams, { sort: "createdAt", dir: "desc" })
    const result = await listProducts(state)

    return (
        <div className="flex h-full flex-col">
            <ProductsTable {...result} state={state} />
        </div>
    )
}
