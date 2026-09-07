import Link from "next/link"
import { requireCurrentAdmin } from "@/lib/auth"
import { Container } from "@/components/container"
import DashboardHeader from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShippingService } from "@/lib/services/shipping-service"
import { RateEditor } from "./rate-editor"
import { TrackingInput } from "./tracking-input"

/**
 * §13.2 item 8: the sidebar linked here and there was nothing to link to.
 *
 * Two jobs, in the order they matter: what delivery costs (previously a literal in the
 * storefront's checkout, changeable only by deploying), and what is waiting to go out.
 */
export const dynamic = "force-dynamic"

export default async function ShippingPage() {
    await requireCurrentAdmin()

    const [rates, queue, destinations, untracked] = await Promise.all([
        ShippingService.rates(),
        ShippingService.fulfilmentQueue(),
        ShippingService.destinations(),
        ShippingService.shippedWithoutTracking(),
    ])

    return (
        <div className="flex flex-col min-h-screen pb-10">
            <DashboardHeader Route="Shipping" />
            <div className="mt-8">
                <Container>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: "Awaiting shipment", value: queue.counts.awaiting_shipment ?? 0 },
                            { label: "In transit", value: queue.counts.shipped ?? 0 },
                            { label: "Delivered", value: queue.counts.delivered ?? 0 },
                            { label: "Shipped, untracked", value: untracked.length, warn: untracked.length > 0 },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-card rounded-lg border p-4 shadow-sm">
                                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                                <p className={`text-2xl font-bold tabular-nums ${stat.warn ? "text-red-600" : ""}`}>
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <section className="mb-10">
                        <h2 className="font-semibold text-lg mb-1">Rates</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Applied when an order is placed. Changing a rate never touches an order already taken —
                            what a customer was charged is a snapshot.
                        </p>
                        <RateEditor rates={rates} />
                    </section>

                    <section className="mb-10">
                        <h2 className="font-semibold text-lg mb-1">Awaiting shipment</h2>
                        <p className="text-sm text-muted-foreground mb-4">Oldest first — the top row has waited longest.</p>
                        <div className="overflow-x-auto border rounded-lg shadow">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Waiting</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Shipping</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {queue.awaiting.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nothing is waiting to ship.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        queue.awaiting.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono">
                                                    <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">
                                                        {order.orderNumber}
                                                    </Link>
                                                </TableCell>
                                                <TableCell
                                                    className={`tabular-nums ${order.waitingDays >= 3 ? "text-red-600 font-medium" : ""}`}
                                                >
                                                    {order.waitingDays === 0 ? "today" : `${order.waitingDays}d`}
                                                </TableCell>
                                                <TableCell>
                                                    {order.shippingAddress ? (
                                                        <>
                                                            <span className="font-medium">{order.shippingAddress.city}</span>
                                                            <span className="text-muted-foreground"> · {order.shippingAddress.fullName}</span>
                                                        </>
                                                    ) : (
                                                        // A real state: the address is optional on the order.
                                                        <span className="text-red-600">no address</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {order.shippingOption.replace("Shipping", "")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{order.shippingCost}</TableCell>
                                                <TableCell className="text-right tabular-nums font-medium">{order.total}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section>
                            <h2 className="font-semibold text-lg mb-1">In transit</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Tracking numbers are entered by hand under COD, so a blank one is normal — and still
                                a parcel nobody can answer a question about.
                            </p>
                            <div className="overflow-x-auto border rounded-lg shadow">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order</TableHead>
                                            <TableHead>Shipped</TableHead>
                                            <TableHead>Tracking</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {queue.inTransit.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    Nothing is in transit.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            queue.inTransit.map((order) => (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono">
                                                        <Link href={`/admin/orders/${order.id}`} className="underline underline-offset-4">
                                                            {order.orderNumber}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="tabular-nums whitespace-nowrap">
                                                        {order.shippedAt ? new Date(order.shippedAt).toLocaleDateString("en-GB") : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {/* The input lives where the gap is reported, rather than
                                                            three clicks away on the order. */}
                                                        <TrackingInput orderId={order.id} current={order.trackingNumber} />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>

                        <section>
                            <h2 className="font-semibold text-lg mb-1">Destinations</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Where orders actually go. Rates are flat today; this is what a per-city rate would be
                                built on.
                            </p>
                            <div className="overflow-x-auto border rounded-lg shadow">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>City</TableHead>
                                            <TableHead className="text-right">Orders</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {destinations.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                                    No orders with an address yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            destinations.map((row) => (
                                                <TableRow key={row.city}>
                                                    <TableCell className="font-medium">{row.city}</TableCell>
                                                    {/* count(*) comes back as bigint and JSON cannot carry one. */}
                                                    <TableCell className="text-right tabular-nums">{Number(row.orders)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    </div>
                </Container>
            </div>
        </div>
    )
}
