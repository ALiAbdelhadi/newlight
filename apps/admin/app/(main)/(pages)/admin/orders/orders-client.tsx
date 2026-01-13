"use client";

import DashboardHeader from "@/components/dashboard-header";
import StatusDropdown from "@/components/status-dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, formatDate } from "@/lib/price";
import { LABEL_MAP } from "@/lib/utils";
import { OrderStatus, Prisma } from "@repo/database";
import { SearchIcon, X, Download, FileSpreadsheet, FileText, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        phoneNumber: true;
        preferredLanguage: true;
        preferredCurrency: true;
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
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState<string | null>(null);
  const router = useRouter();

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

  const canCancelOrder = (status: OrderStatus) => {
    return status !== "cancelled" &&
      status !== "shipped" &&
      status !== "delivered" &&
      status !== "fulfilled";
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel order");
      }

      toast.success("Order cancelled successfully");
      setCancelDialogOpen(null);
      router.refresh();
    } catch (err) {
      console.error("Error cancelling order:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(errorMessage);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    interface ExportRow {
      "Order Number": string;
      "Order ID": string;
      "Order Date": string;
      "Order Updated": string;
      "Order Status": string;
      "Shipping Option": string;
      "Payment Method": string | null;
      "Payment Status": string | null;
      "Tracking Number": string | null;
      "Customer Notes": string | null;
      "Admin Notes": string | null;
      "Subtotal": number;
      "Tax": number | null;
      "Shipping Cost": number;
      "Total": number;
      "Customer Name": string;
      "Customer Email": string | null;
      "Customer Phone": string | null;
      "Customer User ID": string;
      "Customer Preferred Language": string;
      "Customer Preferred Currency": string;
      "Shipping Address Line 1": string | null;
      "Shipping Address Line 2": string | null;
      "Shipping City": string | null;
      "Shipping State": string | null;
      "Shipping Postal Code": string | null;
      "Shipping Country": string | null;
      "Shipping Email": string | null;
      "Product ID": string;
      "Product Name": string;
      "Product Image": string;
      "Product Price": number;
      "Product Quantity": number;
      "Product Color Temp": string | null;
      "Product Color": string | null;
      "Configuration IP Rating": string | null;
      "Configuration Price": number | null;
      "Configuration Price Increase": number | null;
      "Configuration Discount": number | null;
    }

    const exportData: ExportRow[] = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        exportData.push({
          "Order Number": order.orderNumber,
          "Order ID": order.id,
          "Order Date": formatDate(order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt),
          "Order Updated": formatDate(order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt),
          "Order Status": LABEL_MAP[order.status as keyof typeof LABEL_MAP] || order.status,
          "Shipping Option": order.shippingOption || "N/A",
          "Payment Method": order.paymentMethod || null,
          "Payment Status": order.paymentStatus || null,
          "Tracking Number": order.trackingNumber || null,
          "Customer Notes": order.customerNotes || null,
          "Admin Notes": order.adminNotes || null,
          "Subtotal": order.subtotal,
          "Tax": order.tax || null,
          "Shipping Cost": order.shippingCost,
          "Total": order.total,
          "Customer Name": order.shippingAddress?.fullName || "N/A",
          "Customer Email": order.user.email || order.shippingAddress?.email || null,
          "Customer Phone": order.shippingAddress?.phone || order.user.phoneNumber || "N/A",
          "Customer User ID": order.user.id,
          "Customer Preferred Language": order.user.preferredLanguage || "N/A",
          "Customer Preferred Currency": order.user.preferredCurrency || "N/A",
          "Shipping Address Line 1": order.shippingAddress?.addressLine1 || null,
          "Shipping Address Line 2": order.shippingAddress?.addressLine2 || null,
          "Shipping City": order.shippingAddress?.city || null,
          "Shipping State": order.shippingAddress?.state || null,
          "Shipping Postal Code": order.shippingAddress?.postalCode || null,
          "Shipping Country": order.shippingAddress?.country || null,
          "Shipping Email": order.shippingAddress?.email || null,
          "Product ID": item.productId,
          "Product Name": item.productName,
          "Product Image": item.productImage || "N/A",
          "Product Price": item.price,
          "Product Quantity": item.quantity,
          "Product Color Temp": item.selectedColorTemp || null,
          "Product Color": item.selectedColor || null,
          "Configuration IP Rating": order.configuration?.productIp || item.configuration?.productIp || null,
          "Configuration Price": order.configuration?.configPrice || item.configuration?.configPrice || null,
          "Configuration Price Increase": order.configuration?.priceIncrease || item.configuration?.priceIncrease || null,
          "Configuration Discount": order.configuration?.discount || item.configuration?.discount || null,
        });
      });
    });

    const headers = Object.keys(exportData[0]) as Array<keyof ExportRow>;
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers.map((header) => `"${String(row[header])}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `all_orders_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("All orders exported to CSV successfully");
  };

  const exportToExcel = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    interface ExportRow {
      "Order Number": string;
      "Order ID": string;
      "Order Date": string;
      "Order Updated": string;
      "Order Status": string;
      "Shipping Option": string;
      "Payment Method": string | null;
      "Payment Status": string | null;
      "Tracking Number": string | null;
      "Customer Notes": string | null;
      "Admin Notes": string | null;
      "Subtotal": number;
      "Tax": number | null;
      "Shipping Cost": number;
      "Total": number;
      "Customer Name": string;
      "Customer Email": string | null;
      "Customer Phone": string | null;
      "Customer User ID": string;
      "Customer Preferred Language": string;
      "Customer Preferred Currency": string;
      "Shipping Address Line 1": string | null;
      "Shipping Address Line 2": string | null;
      "Shipping City": string | null;
      "Shipping State": string | null;
      "Shipping Postal Code": string | null;
      "Shipping Country": string | null;
      "Shipping Email": string | null;
      "Product ID": string;
      "Product Name": string;
      "Product Image": string;
      "Product Price": number;
      "Product Quantity": number;
      "Product Color Temp": string | null;
      "Product Color": string | null;
      "Configuration IP Rating": string | null;
      "Configuration Price": number | null;
      "Configuration Price Increase": number | null;
      "Configuration Discount": number | null;
    }

    const exportData: ExportRow[] = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        exportData.push({
          "Order Number": order.orderNumber,
          "Order ID": order.id,
          "Order Date": formatDate(order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt),
          "Order Updated": formatDate(order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt),
          "Order Status": LABEL_MAP[order.status as keyof typeof LABEL_MAP] || order.status,
          "Shipping Option": order.shippingOption || "N/A",
          "Payment Method": order.paymentMethod || null,
          "Payment Status": order.paymentStatus || null,
          "Tracking Number": order.trackingNumber || null,
          "Customer Notes": order.customerNotes || null,
          "Admin Notes": order.adminNotes || null,
          "Subtotal": order.subtotal,
          "Tax": order.tax || null,
          "Shipping Cost": order.shippingCost,
          "Total": order.total,
          "Customer Name": order.shippingAddress?.fullName || "N/A",
          "Customer Email": order.user.email || order.shippingAddress?.email || null,
          "Customer Phone": order.shippingAddress?.phone || order.user.phoneNumber || "N/A",
          "Customer User ID": order.user.id,
          "Customer Preferred Language": order.user.preferredLanguage || "N/A",
          "Customer Preferred Currency": order.user.preferredCurrency || "N/A",
          "Shipping Address Line 1": order.shippingAddress?.addressLine1 || null,
          "Shipping Address Line 2": order.shippingAddress?.addressLine2 || null,
          "Shipping City": order.shippingAddress?.city || null,
          "Shipping State": order.shippingAddress?.state || null,
          "Shipping Postal Code": order.shippingAddress?.postalCode || null,
          "Shipping Country": order.shippingAddress?.country || null,
          "Shipping Email": order.shippingAddress?.email || null,
          "Product ID": item.productId,
          "Product Name": item.productName,
          "Product Image": item.productImage || "N/A",
          "Product Price": item.price,
          "Product Quantity": item.quantity,
          "Product Color Temp": item.selectedColorTemp || null,
          "Product Color": item.selectedColor || null,
          "Configuration IP Rating": order.configuration?.productIp || item.configuration?.productIp || null,
          "Configuration Price": order.configuration?.configPrice || item.configuration?.configPrice || null,
          "Configuration Price Increase": order.configuration?.priceIncrease || item.configuration?.priceIncrease || null,
          "Configuration Discount": order.configuration?.discount || item.configuration?.discount || null,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Orders");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `all_orders_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("All orders exported to Excel successfully");
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route="Orders">
        <div className="flex items-center gap-4 md:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <TableHead className="text-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8">
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
                          <TableCell rowSpan={order.items.length}>
                            {canCancelOrder(order.status) && (
                              <AlertDialog
                                open={cancelDialogOpen === order.id}
                                onOpenChange={(open) => setCancelDialogOpen(open ? order.id : null)}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={cancellingOrderId === order.id}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {cancellingOrderId === order.id ? "Cancelling..." : "Cancel"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel order #{order.orderNumber}?
                                      This action cannot be undone. The order will be marked as cancelled.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={cancellingOrderId === order.id}>
                                      No, Keep Order
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelOrder(order.id)}
                                      disabled={cancellingOrderId === order.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Yes, Cancel Order
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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