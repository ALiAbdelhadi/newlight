import { prisma, OPENING_COUNT_PENDING_KEY } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { InventoryService } from "@/lib/services/inventory-service"
import { BulkReceipt, OpeningStocktake } from "./inventory-client"
import { StockTable } from "./stock-table"
import { InlineAlert, PageBody, PageHeader, PageStack, Panel, Section, Stat, StatGrid } from "@/components/page"
import { parseTableState } from "@/lib/table-params"

/**
 * §13.2 items 2 and 3, and N1.
 *
 * The valuation and margin figures print a REASON when the number does not exist yet, never a
 * zero — a stock valuation of "0.00" and a stock valuation nobody has counted are different
 * claims, and only one of them is true. `Stat`'s `unavailable` prop is that distinction made
 * structural, so a later screen cannot quietly render the zero.
 *
 * The stock list is EVERY product, filterable, not a hard-coded low-stock table. The page
 * previously shipped `lowStock(10)` and nothing else, so the only question it could answer was
 * "what is nearly gone" — a stocktake, a cost review or a single SKU lookup had no list to
 * work from. "Low" is now one filter on one table, and the default sort (available ascending)
 * puts the same rows at the top that the old table held on its own.
 */
export const dynamic = "force-dynamic"

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    await requireCurrentAdmin()
    const params = await searchParams

    // Available ascending: the useful end of a stock list is the empty end, so the default
    // view opens on the products that need a decision.
    const state = parseTableState(params, { sort: "available", dir: "asc", pageSize: 50 })

    const [lowStockCount, reports, openingFlag, products, stock] = await Promise.all([
        InventoryService.lowStockCount(10),
        InventoryService.reportsForLastDays(30),
        prisma.systemSetting.findUnique({ where: { key: OPENING_COUNT_PENDING_KEY }, select: { value: true } }),
        prisma.product.findMany({
            where: { deletedAt: null },
            select: { id: true, productId: true, averageCost: true },
            orderBy: { productId: "asc" },
        }),
        InventoryService.stockLevels({
            search: state.filters.q,
            filter: state.filters.filter,
            status: state.filters.status,
            cost: state.filters.cost,
            sort: state.sort,
            dir: state.dir,
            // `toPrismaPage` needs a total this page does not have yet, so the offset is
            // computed here and CLAMPED inside the query, against the count it just ran.
            skip: (state.page - 1) * state.pageSize,
            take: state.pageSize,
        }),
    ])

    const openingPending = openingFlag?.value === "true"
    const withoutCost = products.filter((p) => p.averageCost === null).length

    const unavailableReason = (reason: string | undefined) =>
        reason === "opening-count-pending" ? "opening count pending" : "cost not recorded"

    return (
        <>
            <PageHeader
                title="Inventory"
                description="Stock levels come from the ledger, not from a column anybody edits. Valuation and margin refuse to produce a number until there is a cost behind it."
            />

            <PageBody>
                <PageStack>
                    {openingPending && (
                        <InlineAlert
                            tone="warning"
                            title="Opening count still pending"
                            action={<OpeningStocktake />}
                        >
                            Stock levels came across from the migration as an opening balance nobody has physically
                            counted. Until a real stocktake closes it, valuation and margin refuse to produce a number
                            rather than produce a wrong one.
                        </InlineAlert>
                    )}

                    <StatGrid>
                        <Stat
                            label="Stock valuation"
                            {...(reports.valuation.available
                                ? { value: reports.valuation.value }
                                : { unavailable: unavailableReason(reports.valuation.reason) })}
                        />
                        <Stat
                            label="Gross margin"
                            hint="last 30 days"
                            {...(reports.margin.available
                                ? { value: reports.margin.value }
                                : { unavailable: unavailableReason(reports.margin.reason) })}
                        />
                        {/*
                          * The count is a link into the table's own filter rather than the
                          * heading of a second table. A figure an operator cannot act on is
                          * half a feature, and two tables listing the same rows under two
                          * headings is how a page grows two answers to the same question.
                          */}
                        <Stat
                            label="Low stock"
                            value={lowStockCount}
                            hint="fewer than 10 available"
                            href="/admin/inventory?filter=low"
                            tone={lowStockCount > 0 ? "warning" : "default"}
                        />
                        <Stat
                            label="Products with no cost"
                            value={withoutCost}
                            hint={withoutCost > 0 ? "blocks margin reporting" : "every product costed"}
                            href="/admin/inventory?cost=missing"
                            tone={withoutCost > 0 ? "warning" : "default"}
                        />
                    </StatGrid>

                    <Section
                        title="Stock levels"
                        description="Every product, at the main location. Available is on hand minus reservations — the number a customer can actually be sold. Stock is only ever changed through the ledger, so a row opens the product's inventory tab rather than an editable field."
                    >
                        <Panel padded={false}>
                            <StockTable
                                rows={stock.rows}
                                total={stock.total}
                                openingCountPending={openingPending}
                                state={state}
                            />
                        </Panel>
                    </Section>

                    <Section
                        id="bulk-cost-entry"
                        title="Bulk cost entry"
                        description={
                            <>
                                One row per product: SKU, quantity, unit cost. Every row becomes a purchase receipt in
                                the ledger, and the unit costs are what make margin reporting possible at all. A blank
                                cost means <em>not recorded</em> — never zero.
                            </>
                        }
                    >
                        <BulkReceipt
                            products={products.map((p) => ({
                                id: p.id,
                                sku: p.productId,
                                hasCost: p.averageCost !== null,
                            }))}
                        />
                    </Section>
                </PageStack>
            </PageBody>
        </>
    )
}
