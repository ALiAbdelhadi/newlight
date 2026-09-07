import Link from "next/link"
import { prisma, OPENING_COUNT_PENDING_KEY } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InventoryService } from "@/lib/services/inventory-service"
import { BulkReceipt, OpeningStocktake } from "./inventory-client"

/**
 * §13.2 items 2 and 3, and N1.
 *
 * The valuation and margin cards print a REASON when the number does not exist yet, never a
 * zero — a stock valuation of "0.00" and a stock valuation nobody has counted are different
 * claims, and only one of them is true.
 */
export const dynamic = "force-dynamic"

export default async function InventoryPage() {
    await requireCurrentAdmin()

    const [lowStock, reports, openingFlag, products] = await Promise.all([
        InventoryService.lowStock(10),
        InventoryService.reportsForLastDays(30),
        prisma.systemSetting.findUnique({ where: { key: OPENING_COUNT_PENDING_KEY }, select: { value: true } }),
        prisma.product.findMany({
            where: { deletedAt: null },
            select: { id: true, productId: true, averageCost: true },
            orderBy: { productId: "asc" },
        }),
    ])

    const openingPending = openingFlag?.value === "true"
    const withoutCost = products.filter((p) => p.averageCost === null).length

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Inventory" />
            <div className="mt-8">
                <Container>
                    {openingPending && (
                        <div className="rounded-lg border border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/10 p-4 mb-8">
                            <h2 className="font-semibold mb-1">Opening count still pending</h2>
                            <p className="text-sm text-muted-foreground mb-3">
                                Stock levels came across from the migration as an opening balance nobody has physically
                                counted. Until a real stocktake closes it, valuation and margin refuse to produce a
                                number rather than produce a wrong one.
                            </p>
                            <OpeningStocktake />
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <p className="text-sm text-muted-foreground mb-1">Stock valuation</p>
                            {reports.valuation.available ? (
                                <p className="text-2xl font-bold tabular-nums">{reports.valuation.value}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground pt-2">
                                    {reports.valuation.reason === "opening-count-pending"
                                        ? "opening count pending"
                                        : "cost not recorded"}
                                </p>
                            )}
                        </div>
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <p className="text-sm text-muted-foreground mb-1">Gross margin (30d)</p>
                            {reports.margin.available ? (
                                <p className="text-2xl font-bold tabular-nums">{reports.margin.value}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground pt-2">
                                    {reports.margin.reason === "opening-count-pending"
                                        ? "opening count pending"
                                        : "cost not recorded"}
                                </p>
                            )}
                        </div>
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <p className="text-sm text-muted-foreground mb-1">Low stock</p>
                            <p className={`text-2xl font-bold tabular-nums ${lowStock.length > 0 ? "text-red-600" : ""}`}>
                                {lowStock.length}
                            </p>
                        </div>
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <p className="text-sm text-muted-foreground mb-1">Products with no cost</p>
                            <p className="text-2xl font-bold tabular-nums">{withoutCost}</p>
                        </div>
                    </div>

                    <section className="mb-10">
                        <h2 className="font-semibold text-lg mb-1">Bulk cost entry</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            One row per product: SKU, quantity, unit cost. Every row becomes a purchase receipt in the
                            ledger, and the unit costs are what make margin reporting possible at all. A blank cost
                            means <em>not recorded</em> — never zero.
                        </p>
                        <BulkReceipt
                            products={products.map((p) => ({
                                id: p.id,
                                sku: p.productId,
                                hasCost: p.averageCost !== null,
                            }))}
                        />
                    </section>

                    <section>
                        <h2 className="font-semibold text-lg mb-1">Low stock</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Fewer than 10 available. Available, not on hand — reserved units are already spoken for.
                        </p>
                        <div className="overflow-x-auto border rounded-lg shadow">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">On hand</TableHead>
                                        <TableHead className="text-right">Reserved</TableHead>
                                        <TableHead className="text-right">Available</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStock.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nothing is running low.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lowStock.map((row) => (
                                            <TableRow key={row.productId}>
                                                <TableCell className="font-mono">
                                                    <Link
                                                        href={`/admin/products/${row.productId}?tab=inventory`}
                                                        className="underline underline-offset-4"
                                                    >
                                                        {row.sku}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{row.onHand}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.reserved}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {row.available <= 0 ? (
                                                        <Badge variant="destructive">{row.available}</Badge>
                                                    ) : (
                                                        <span className="font-medium text-red-600">{row.available}</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                </Container>
            </div>
        </div>
    )
}
