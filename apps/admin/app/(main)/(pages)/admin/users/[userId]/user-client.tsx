"use client";

import NormalPrice from "@/components//normal-price";
import { Container } from "@/components/container";
import DiscountPrice from "@/components/discount-price";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserAvatar from "@/components/user-avatar";
import { formatPrice } from "@/lib/utils";
import { Order, Product, ShippingAddress, User } from "@prisma/client";
import { format } from "date-fns";
import { Edit2, FilePenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import StatusDropdown from "../../../../../../components/status-dropdown-menu";

interface UserWithDetails extends User {
  shippingAddress: ShippingAddress | null;
  product: Product | null;
  orders: Order[];
}

interface UserPageClientProps {
  user: UserWithDetails;
}

const UserPageClient = ({ user }: UserPageClientProps) => {
  const [filter, setFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    if (!user) return [];
    return user.orders.filter((order) => {
      if (filter === "all") return true;
      return order.status.toLowerCase() === filter.toLowerCase();
    });
  }, [filter, user]);

  const renderOrders = useMemo(
    () =>
      filteredOrders.map((order) => (
        <TableRow key={order.id}>
          <TableCell className="hover:text-primary hover:underline font-medium">
            <Link href={`/admin/dashboard/Orders/${order.id}`}>
              #{order.id}
            </Link>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3 w-[200px]">
              {order.productImages && order.productImages.length > 0 && (
                <Image
                  src={order.productImages[0]}
                  alt="Product Image"
                  width={40}
                  height={40}
                  className="rounded-md object-cover shrink-0"
                />
              )}
              <p className="uppercase text-sm font-medium line-clamp-2">
                {order.productName}
              </p>
            </div>
          </TableCell>
          <TableCell className="capitalize font-medium">
            {order.productColorTemp}
          </TableCell>
          <TableCell className="font-medium">
            {order.brand === "balcom" ? order.productIp : "—"}
          </TableCell>
          <TableCell className="font-medium">
            {order.brand === "mister-led" &&
              order.chandelierLightingType === "lamp"
              ? order.productChandLamp
              : "—"}
          </TableCell>
          <TableCell className="font-medium">
            <NormalPrice price={order.configPrice} />
          </TableCell>
          <TableCell className="font-medium">
            {order.discountRate && order.discountRate > 0
              ? `${(order.discountRate * 100).toFixed(0)}%`
              : "—"}
          </TableCell>
          <TableCell className="font-medium">
            {order.discountRate && order.discountRate > 0 ? (
              <DiscountPrice
                price={order.configPrice}
                discount={order.discountRate}
              />
            ) : (
              "—"
            )}
          </TableCell>
          <TableCell className="text-center font-medium">
            {order.quantity}
          </TableCell>
          <TableCell className="font-medium">
            {formatPrice(order.shippingPrice)}
          </TableCell>
          <TableCell className="font-medium">
            {order.discountRate && order.discountRate > 0 ? (
              <DiscountPrice
                price={order.configPrice}
                discount={order.discountRate}
                quantity={order.quantity}
                shippingPrice={order.shippingPrice}
              />
            ) : (
              <NormalPrice
                price={order.configPrice}
                shippingPrice={order.shippingPrice}
                quantity={order.quantity}
              />
            )}
          </TableCell>
          <TableCell className="font-medium">
            {order.createdAt?.toLocaleDateString()}
          </TableCell>
          <TableCell className="font-medium">
            {order.orderTimeReceived?.toLocaleDateString()}
          </TableCell>
          <TableCell>
            <StatusDropdown id={order.id} orderStatus={order.status} />
          </TableCell>
        </TableRow>
      )),
    [filteredOrders]
  );

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {user.shippingAddress?.fullName}&apos;s Account
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="col-span-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mb-6">
                <div className="shrink-0">
                  <UserAvatar email={user.email ?? ""} className="h-12 w-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold truncate">{user.email}</h2>
                  <p className="text-xs text-muted-foreground">
                    Member since {format(new Date(user.createdAt), "MMM yyyy")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Full Name
                  </p>
                  <p className="text-sm font-medium">
                    {user.shippingAddress?.fullName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm font-medium break-all">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="text-sm font-medium">
                    {user.shippingAddress?.phoneNumber || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Shipping Information</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <FilePenIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">
                    Billing Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.address || "—"}
                    </p>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.phoneNumber || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.address || "—"}
                    </p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.phoneNumber || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-lg">Order History</CardTitle>
              <CardDescription>View and manage your past orders</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-5">
                <TabsTrigger
                  value="all"
                  onClick={() => setFilter("all")}
                  className="text-xs"
                >
                  All Orders
                </TabsTrigger>
                <TabsTrigger
                  value="awaiting_shipment"
                  onClick={() => setFilter("awaiting_shipment")}
                  className="text-xs"
                >
                  Awaiting
                </TabsTrigger>
                <TabsTrigger
                  value="processing"
                  onClick={() => setFilter("processing")}
                  className="text-xs"
                >
                  Processing
                </TabsTrigger>
                <TabsTrigger
                  value="fulfilled"
                  onClick={() => setFilter("fulfilled")}
                  className="text-xs"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  onClick={() => setFilter("cancelled")}
                  className="text-xs"
                >
                  Cancelled
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-0">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold">
                          Order #
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Product
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Color Temp
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          IP
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Lamp
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Price
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Discount
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          After Discount
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-center">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Shipping
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Total
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Order Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Est. Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderOrders.length > 0 ? (
                        renderOrders
                      ) : (
                        <TableRow>
                          <TableCell colSpan={14} className="text-center py-8">
                            <p className="text-muted-foreground">
                              No orders found
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default UserPageClient;