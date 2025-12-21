"use client";
import { Container } from "@/components/container";
import StatusDropdown from "@/components/status-dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/price";
import { OrderStatus, Prisma } from "@repo/database";
import { format } from "date-fns";
import { Box, Calendar, MapPin, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    shippingAddress: true;
    user: {
      select: {
        id: true;
        email: true;
        phoneNumber: true;
      };
    };
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

interface OrderPageProps {
  order: OrderWithDetails;
}

export default function OrderPage({ order }: OrderPageProps) {
  const orderProgress = getOrderProgress(order.status);

  return (
    <div className="py-8">
      <Container>
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="p-6 bg-primary text-primary-foreground">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl mb-2">
                  Order #{order.orderNumber}
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 mt-5">
                  Placed on {format(order.createdAt, "PPP")}
                </CardDescription>
              </div>
              <StatusDropdown id={order.id} orderStatus={order.status} />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto custom-scrollbar">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
              <span>Last updated: {format(order.updatedAt, "PPP")}</span>
            </div>
            <Progress value={orderProgress} className="w-full h-3 mb-2" />
            <div className="flex justify-between text-xs sm:text-sm font-medium">
              <span>Ordered</span>
              <span>Processing</span>
              <span>Fulfilled</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 md:grid-cols-3 grid-cols-1">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                <Box className="mr-2" /> Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              {order.items.map((item, index) => (
                <div
                  key={item.id}
                  className={index > 0 ? "mt-6 pt-6 border-t" : ""}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
                    {item.productImage && (
                      <Image
                        width={192}
                        height={192}
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full sm:w-48 sm:h-48 object-cover rounded-md shadow-md mb-4 sm:mb-0"
                      />
                    )}
                    <div className="flex-1 space-y-4">
                      <h3 className="text-lg sm:text-xl font-semibold">
                        {item.productName}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ProductDetail label="Quantity" value={item.quantity} />
                        <ProductDetail
                          label="Color Temperature"
                          value={item.selectedColorTemp || "N/A"}
                        />
                        <ProductDetail
                          label="IP Rating"
                          value={order.configuration?.productIp || "N/A"}
                        />
                        <ProductDetail
                          label="Price"
                          value={formatPrice(item.price)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                Price Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              <div className="space-y-4">
                <PriceDetail
                  label="Subtotal"
                  value={formatPrice(order.subtotal)}
                />
                {order.tax && order.tax > 0 && (
                  <PriceDetail label="Tax" value={formatPrice(order.tax)} />
                )}
                <PriceDetail
                  label="Shipping"
                  value={formatPrice(order.shippingCost)}
                />
                <Separator className="my-2" />
                <PriceDetail
                  label="Total"
                  value={formatPrice(order.total)}
                  className="font-bold text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                <Truck className="mr-2" /> Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              {order.shippingAddress ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-7 w-7 mr-1.5">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${order.user.email || order.user.id}`}
                          alt={order.user.email || ""}
                        />
                        <AvatarFallback>
                          {order.user.email
                            ?.split("@")[0]
                            .slice(0, 2)
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {order.shippingAddress.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.shippingAddress.phone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.user.email}
                        </p>
                        <Link
                          href={`/admin/dashboard/users/${order.user.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          View Customer
                        </Link>
                      </div>
                    </div>
                    <ShippingDetail
                      icon={MapPin}
                      value={`${order.shippingAddress.addressLine1}${
                        order.shippingAddress.addressLine2
                          ? `, ${order.shippingAddress.addressLine2}`
                          : ""
                      }, ${order.shippingAddress.city}${
                        order.shippingAddress.state
                          ? `, ${order.shippingAddress.state}`
                          : ""
                      } ${order.shippingAddress.postalCode}, ${
                        order.shippingAddress.country
                      }`}
                    />
                  </div>
                  <div className="space-y-4">
                    {order.shippedAt && (
                      <ShippingDetail
                        icon={Calendar}
                        value={`Shipped: ${format(order.shippedAt, "PPP")}`}
                      />
                    )}
                    {order.deliveredAt && (
                      <ShippingDetail
                        icon={Calendar}
                        value={`Delivered: ${format(order.deliveredAt, "PPP")}`}
                      />
                    )}
                    {order.trackingNumber && (
                      <ShippingDetail
                        icon={Truck}
                        value={`Tracking: ${order.trackingNumber}`}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No shipping information available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}

function ProductDetail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="secondary" className="w-fit">
        {value}
      </Badge>
    </div>
  );
}

function PriceDetail({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ShippingDetail({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value: string;
}) {
  return (
    <div className="flex items-start space-x-2">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <span className="text-sm">{value}</span>
    </div>
  );
}

function getOrderProgress(status: OrderStatus): number {
  switch (status) {
    case "awaiting_shipment":
      return 25;
    case "processing":
      return 50;
    case "shipped":
      return 75;
    case "delivered":
    case "fulfilled":
      return 100;
    case "cancelled":
    case "refunded":
      return 0;
    default:
      return 0;
  }
}
