"use client";

import { Container } from "@/components/container";
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
import { formatPrice } from "@/lib/price";
import { Prisma } from "@repo/database";
import { format } from "date-fns";
import { Edit2, FilePenIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import StatusDropdown from "../../../../../../components/status-dropdown-menu";

const userWithDetailsInclude = Prisma.validator<Prisma.UserInclude>()({
  shippingAddress: true,
  product: true,
  orders: {
    include: {
      items: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
      configuration: true,
    },
  },
});

type UserWithDetails = Prisma.UserGetPayload<{
  include: typeof userWithDetailsInclude;
}>;

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
      filteredOrders.map((order) => {
        const firstItem = order.items[0];
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

        return (
          <TableRow key={order.id}>
            <TableCell className="hover:text-primary hover:underline font-medium">
              <Link href={`/admin/dashboard/orders/${order.id}`}>
                #{order.orderNumber}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3 w-[200px]">
                {firstItem?.productImage && (
                  <Image
                    src={firstItem.productImage}
                    alt="Product Image"
                    width={40}
                    height={40}
                    className="rounded-md object-cover shrink-0"
                  />
                )}
                <div className="flex flex-col">
                  <p className="text-sm font-medium line-clamp-2">
                    {firstItem?.productName || "N/A"}
                  </p>
                  {order.items.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{order.items.length - 1} more items
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="capitalize font-medium">
              {firstItem?.selectedColorTemp || "—"}
            </TableCell>
            <TableCell className="font-medium">
              {firstItem?.product?.ipRating || "—"}
            </TableCell>
            <TableCell className="font-medium">
              {firstItem?.selectedColor || "—"}
            </TableCell>
            <TableCell className="font-medium">
              {formatPrice(firstItem?.price || 0)}
            </TableCell>
            <TableCell className="font-medium">
              {order.configuration && order.configuration.discount > 0
                ? `${(order.configuration.discount * 100).toFixed(0)}%`
                : "—"}
            </TableCell>
            <TableCell className="font-medium">
              {order.configuration && order.configuration.discount > 0
                ? formatPrice(
                  (firstItem?.price || 0) * (1 - order.configuration.discount)
                )
                : "—"}
            </TableCell>
            <TableCell className="text-center font-medium">
              {totalItems}
            </TableCell>
            <TableCell className="font-medium">
              {formatPrice(order.shippingCost)}
            </TableCell>
            <TableCell className="font-medium">
              {formatPrice(order.total)}
            </TableCell>
            <TableCell className="font-medium">
              {format(new Date(order.createdAt), "MMM dd, yyyy")}
            </TableCell>
            <TableCell className="font-medium">
              {order.deliveredAt
                ? format(new Date(order.deliveredAt), "MMM dd, yyyy")
                : "—"}
            </TableCell>
            <TableCell>
              <StatusDropdown id={order.id} orderStatus={order.status} />
            </TableCell>
          </TableRow>
        );
      }),
    [filteredOrders]
  );

  return (
    <div className="py-8">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {user.shippingAddress?.fullName || user.email}&apos;s Account
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
                    {user.shippingAddress?.phone || user.phoneNumber || "—"}
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
                      {user.shippingAddress?.addressLine1 || "—"}
                    </p>
                    {user.shippingAddress?.addressLine2 && (
                      <p className="text-muted-foreground">
                        {user.shippingAddress.addressLine2}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.city}, {user.shippingAddress?.state}{" "}
                      {user.shippingAddress?.postalCode}
                    </p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.country}
                    </p>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.phone || user.phoneNumber || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.addressLine1 || "—"}
                    </p>
                    {user.shippingAddress?.addressLine2 && (
                      <p className="text-muted-foreground">
                        {user.shippingAddress.addressLine2}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.city}, {user.shippingAddress?.state}{" "}
                      {user.shippingAddress?.postalCode}
                    </p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.country}
                    </p>
                    <p className="text-muted-foreground">
                      {user.shippingAddress?.phone || user.phoneNumber || "—"}
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
              <CardDescription>View and manage past orders</CardDescription>
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
                          Color
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
                          Delivery Date
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