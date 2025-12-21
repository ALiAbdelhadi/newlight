"use client";

import DashboardHeader from "@/components/dashboard-header";
import StatusDropdown from "@/components/status-dropdown-menu";
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
import { SearchIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>(orders);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchItem(searchValue);
    setLoading(true);
    setError(null);
    try {
      const newFilteredOrders = orders.filter((order) => {
        const orderNumberMatch = order.orderNumber
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const customerNameMatch = order.shippingAddress?.fullName
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const customerEmailMatch = order.user.email
          ?.toLowerCase()
          .includes(searchValue.toLowerCase());
        const productMatch = order.items.some((item) =>
          item.productName.toLowerCase().includes(searchValue.toLowerCase())
        );

        return (
          orderNumberMatch ||
          customerNameMatch ||
          customerEmailMatch ||
          productMatch
        );
      });
      setFilteredOrders(newFilteredOrders);
    } catch {
      setError("Error filtering orders.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Orders">
        <div className="flex items-center gap-4 md:ml-auto">
          <form className="ml-auto flex-1 sm:flex-initial">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchItem}
                onChange={handleInputChange}
                type="text"
                placeholder="Search orders..."
                className="pl-8 w-full sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
        </div>
      </DashboardHeader>
      <div className="mt-10 px-6">
        <h2 className="text-xl font-semibold mb-7">All Orders</h2>
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
              {loading && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-destructive"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading && !error && filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    No Orders Found
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                !error &&
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
                              href={`/admin/dashboard/orders/${order.id}`}
                              className="hover:text-primary hover:underline"
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
                )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default OrdersClient;
