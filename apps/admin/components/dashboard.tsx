"use client"

import { divideMoney, isZeroMoney, sumMoney, type SerializedMoney } from "@repo/database"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useResponsiveOrientation } from "@/hooks/use-responsive-orientation"
import { formatDate, formatPrice } from "@/lib/price"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { OrderStatus } from "@repo/database"
import {
    Banknote,
    MoreHorizontal,
    Package,
    ShoppingCart,
    Users
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"

interface FlattenedOrder {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    customerAvatar?: string
    productName: string
    productImage: string
    productPrice: SerializedMoney
    quantity: number
    shippingPrice: SerializedMoney
    totalPrice: SerializedMoney
    status: OrderStatus
    createdAt: string
    user: {
        id: string
        email: string | null
        phoneNumber: string | null
        preferredLanguage: string
        preferredCurrency: string
    }
}

/*
 * The 64px masthead that stood here is gone.
 *
 * It carried a blue package icon, the words "E-commerce Admin", an avatar menu and a theme
 * toggle — a second, competing application header sitting directly beneath the real one, on
 * the one screen an operator opens first. The name of the product is in the sidebar, the
 * account menu and theme control are in the top bar, and "E-commerce Admin" told nobody
 * anything they did not know from having signed into it.
 *
 * `text-blue-600` was also the last hardcoded palette colour on this screen: a literal that
 * no token could reach and that did not change in dark mode.
 */

function DashboardSummary({ orders }: { orders: FlattenedOrder[] }) {
    const stats = useMemo(() => {
        // Decimal arithmetic, not `sum + price` over floats — this is revenue (ADR 0001).
        const totalSales = sumMoney(
            orders.filter((order) => order.status !== "cancelled").map((order) => order.totalPrice)
        )

        const totalOrders = new Set(orders.map((order) => order.orderNumber)).size
        const totalCustomers = new Set(orders.map((order) => order.customerEmail)).size
        const avgOrderValue = divideMoney(totalSales, Math.max(totalOrders, 1))

        return {
            totalSales,
            totalOrders,
            totalCustomers,
            avgOrderValue,
        }
    }, [orders])

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(stats.avgOrderValue)}</div>
                </CardContent>
            </Card>
        </div>
    )
}

interface DashboardClientProps {
    initialOrders: FlattenedOrder[]
}

export default function DashboardClient({ initialOrders }: DashboardClientProps) {
    const [filter, setFilter] = useState<string>("all")
    const [orders] = useState<FlattenedOrder[]>(initialOrders)
    const orientation = useResponsiveOrientation()

    const filteredOrders = useMemo(() => {
        if (filter === "all") return orders
        return orders.filter((order) => order.status === filter)
    }, [filter, orders])


    return (
        <div className="min-h-screen">
            <div className="flex flex-col gap-6 p-4 lg:p-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your store today.</p>
                </div>
                <DashboardSummary orders={orders} />
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Recent Orders</h3>
                    </div>
                    <Tabs orientation={orientation} value={filter} onValueChange={setFilter} className="w-full">
                        <TabsList
                            className={cn(
                                orientation === "horizontal"
                                    ? "inline-flex h-10 items-center justify-center p-1 text-muted-foreground max-w-fit"
                                    : "flex flex-col h-auto w-full max-w-xs space-y-1 p-2",
                            )}
                        >
                            <TabsTrigger className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap",
                                orientation === "vertical" && "justify-between w-full py-3 px-4",
                            )} value="all">All Orders</TabsTrigger>
                            <TabsTrigger className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap",
                                orientation === "vertical" && "justify-between w-full py-3 px-4",
                            )} value="awaiting_shipment">Awaiting</TabsTrigger>
                            <TabsTrigger className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap",
                                orientation === "vertical" && "justify-between w-full py-3 px-4",
                            )} value="processing">Processing</TabsTrigger>
                            <TabsTrigger className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap",
                                orientation === "vertical" && "justify-between w-full py-3 px-4",
                            )} value="fulfilled">Fulfilled</TabsTrigger>
                            <TabsTrigger className={cn(
                                "inline-flex items-center justify-center whitespace-nowrap",
                                orientation === "vertical" && "justify-between w-full py-3 px-4",
                            )} value="cancelled">Cancelled</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders</CardTitle>
                            <CardDescription>Manage your orders and view their status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Order</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Discount</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Shipping</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOrders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                                                    No orders found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredOrders.map((order, idx) => (
                                                <TableRow key={`${order.id}-${idx}`}>
                                                    <TableCell className="font-medium">
                                                        <Link
                                                            href={`/admin/orders/${order.id}`}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            #{order.orderNumber}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={order.customerAvatar} />
                                                                <AvatarFallback>
                                                                    {order.customerName
                                                                        .split(" ")
                                                                        .map((n) => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">{order.customerName}</div>
                                                                <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Image
                                                                width={40}
                                                                height={40}
                                                                src={order.productImage}
                                                                alt={order.productName}
                                                                className="h-10 w-10 rounded object-cover"
                                                            />
                                                            <div className="font-medium text-nowrap">{order.productName}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{formatPrice(order.productPrice)}</div>
                                                    </TableCell>
                                                    <TableCell className="text-nowrap">
                                                        <span className="text-muted-foreground">—</span>
                                                    </TableCell>
                                                    <TableCell>{order.quantity}</TableCell>
                                                    <TableCell>{isZeroMoney(order.shippingPrice) ? "Free" : formatPrice(order.shippingPrice)}</TableCell>
                                                    <TableCell className="font-medium">{formatPrice(order.totalPrice)}</TableCell>
                                                    <TableCell className="text-nowrap">{formatDate(order.createdAt)}</TableCell>
                                                    <TableCell className="text-nowrap">
                                                        <StatusBadge kind="order" value={order.status} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">Actions</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/orders/${order.id}`}>View Order</Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/users/${order.user.id}`}>View Customer</Link>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}