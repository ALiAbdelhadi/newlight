"use client"

import AuthAvatar from "@/components/auth-avatar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useResponsiveOrientation } from "@/hooks/use-responsive-orientation"
import { formatDate, formatPrice } from "@/lib/price"
import { cn, getStatusBadgeClassName, LABEL_MAP } from "@/lib/utils"
import { OrderStatus } from "@repo/database"
import {
    MoreHorizontal,
    Package,
    ShoppingCart,
    Users
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ThemeToggle } from "./theme-toggle"

interface FlattenedOrder {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    customerAvatar?: string
    productName: string
    productImage: string
    productPrice: number
    quantity: number
    shippingPrice: number
    discountRate: number
    totalPrice: number
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

function DashboardHeader() {
    return (
        <header className="border-b">
            <div className="flex h-16 items-center px-4 lg:px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-6 w-6 text-blue-600" />
                        <h1 className="text-xl font-semibold">E-commerce Admin</h1>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <AuthAvatar />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}

function DashboardSummary({ orders }: { orders: FlattenedOrder[] }) {
    const stats = useMemo(() => {
        const totalSales = orders
            .filter((order) => order.status !== "cancelled")
            .reduce((sum, order) => sum + order.totalPrice, 0)

        const totalOrders = new Set(orders.map((order) => order.orderNumber)).size
        const totalCustomers = new Set(orders.map((order) => order.customerEmail)).size
        const avgOrderValue = totalSales / Math.max(totalOrders, 1)

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
                    <span className="text-base text-muted-foreground">EGP</span>
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

    const calculateDiscountedPrice = (price: number, discount: number) => {
        return price * (1 - discount)
    }

    return (
        <div className="min-h-screen">
            <DashboardHeader />
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
                                                        {order.discountRate > 0 ? (
                                                            <div className="space-y-1">
                                                                <div className="line-through text-sm text-muted-foreground">
                                                                    {formatPrice(order.productPrice)}
                                                                </div>
                                                                <div className="font-medium">
                                                                    {formatPrice(calculateDiscountedPrice(order.productPrice, order.discountRate))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="font-medium">{formatPrice(order.productPrice)}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-nowrap">
                                                        {order.discountRate > 0 ? (
                                                            <Badge variant="secondary">{Math.round(order.discountRate * 100)}% OFF</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">No discount</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{order.quantity}</TableCell>
                                                    <TableCell>{order.shippingPrice > 0 ? formatPrice(order.shippingPrice) : "Free"}</TableCell>
                                                    <TableCell className="font-medium">{formatPrice(order.totalPrice)}</TableCell>
                                                    <TableCell className="text-nowrap">{formatDate(order.createdAt)}</TableCell>
                                                    <TableCell className="text-nowrap">
                                                        <Badge className={getStatusBadgeClassName(order.status)}>{LABEL_MAP[order.status]}</Badge>
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