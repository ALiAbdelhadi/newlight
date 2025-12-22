"use client";

import DashboardHeader from "@/components/dashboard-header";
import StatusDropdown from "@/components/status-dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/price";
import { Prisma } from "@repo/database";
import { SearchIcon, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        phoneNumber: true;
      };
    };
    shippingAddress: true;
    items: {
      include: {
        product: {
          include: {
            translations: {
              take: 1;
            };
          };
        };
        configuration: true;
      };
    };
    configuration: true;
  };
}>;

interface OrdersClientProps {
  orders: OrderWithItems[];
}

const OrdersClient: React.FC<OrdersClientProps> = ({ orders }) => {
  const [searchItem, setSearchItem] = useState<string>("");

  const filteredOrders = useMemo(() => {
    if (!searchItem.trim()) return orders;

    const searchLower = searchItem.toLowerCase().trim();

    return orders.filter((order) => {
      if (order.orderNumber.toLowerCase().includes(searchLower)) {
        return true;
      }

      if (order.shippingAddress?.fullName.toLowerCase().includes(searchLower)) {
        return true;
      }

      if (order.user.email?.toLowerCase().includes(searchLower)) {
        return true;
      }

      if (
        order.shippingAddress?.phone.includes(searchLower) ||
        order.user.phoneNumber?.includes(searchLower)
      ) {
        return true;
      }

      const hasMatchingProduct = order.items.some((item) =>
        item.productName.toLowerCase().includes(searchLower)
      );
      if (hasMatchingProduct) {
        return true;
      }

      if (order.total.toString().includes(searchLower)) {
        return true;
      }

      if (order.status.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });
  }, [orders, searchItem]);

  const handleClearSearch = () => {
    setSearchItem("");
  };

  const searchStats = useMemo(() => {
    return {
      total: orders.length,
      filtered: filteredOrders.length,
      isFiltering: searchItem.trim().length > 0,
    };
  }, [orders.length, filteredOrders.length, searchItem]);

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Orders">
        <div className="flex items-center gap-4 md:ml-auto">
          <form className="ml-auto flex-1 sm:flex-initial" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                type="text"
                placeholder="Search orders, customers, products..."
                className="pl-8 pr-10 w-full sm:w-[300px] md:w-[200px] lg:w-[350px]"
              />
              {searchItem && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={handleClearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </DashboardHeader>

      <div className="mt-10 px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">All Orders</h2>
            {searchStats.isFiltering && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing {searchStats.filtered} of {searchStats.total} orders
              </p>
            )}
          </div>

          {searchStats.isFiltering && (
            <Badge variant="secondary" className="text-sm">
              {searchStats.filtered} results
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto border rounded-lg shadow custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-nowrap">Order #</TableHead>
                <TableHead className="text-nowrap">Customer Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-nowrap">Color Temp</TableHead>
                <TableHead className="text-nowrap">IP Rating</TableHead>
                <TableHead className="text-nowrap">Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-nowrap">Shipping</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-nowrap">Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    {searchStats.isFiltering ? (
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          No orders found matching &quot;{searchItem}&quot;
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearSearch}
                        >
                          Clear Search
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No Orders Found</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) =>
                  order.items.map((item, itemIndex) => (
                    <TableRow key={`${order.id}-${item.id}`}>
                      {itemIndex === 0 && (
                        <>
                          <TableCell
                            className="px-4 py-2"
                            rowSpan={order.items.length}
                          >
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="hover:text-primary hover:underline font-medium"
                            >
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell
                            className="px-4 py-2 text-nowrap"
                            rowSpan={order.items.length}
                          >
                            {order.shippingAddress?.fullName || "N/A"}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="flex w-[250px] items-center">
                        {item.productImage && (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            width={40}
                            height={40}
                            className="rounded-md object-cover mr-2"
                          />
                        )}
                        <p className="uppercase text-nowrap font-medium">
                          {item.productName}
                        </p>
                      </TableCell>
                      <TableCell className="capitalize font-medium">
                        {item.selectedColorTemp || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.configuration?.productIp || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-2 font-medium">
                        {formatPrice(item.price)}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      {itemIndex === 0 && (
                        <>
                          <TableCell
                            className="text-nowrap"
                            rowSpan={order.items.length}
                          >
                            {formatPrice(order.shippingCost)}
                          </TableCell>
                          <TableCell
                            className="font-medium"
                            rowSpan={order.items.length}
                          >
                            {formatPrice(order.total)}
                          </TableCell>
                          <TableCell
                            className="text-nowrap"
                            rowSpan={order.items.length}
                          >
                            {order.shippingAddress?.phone || "N/A"}
                          </TableCell>
                          <TableCell rowSpan={order.items.length}>
                            {order.createdAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell rowSpan={order.items.length}>
                            <StatusDropdown
                              id={order.id}
                              orderStatus={order.status}
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </div>
        {searchStats.isFiltering && searchStats.filtered > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Search tip:</span> You can search by order number, customer name, email, phone, product name, status, or total amount
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersClient;