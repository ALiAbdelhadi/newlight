"use server";

import { currentAdmin, currentAdminId, requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";

export const DashboardServer = async () => {
  // The dashboard is admin-only, so being signed in is not the question — having the role
  // is. currentAdmin() returns null for a signed-in CUSTOMER too.
  const admin = await currentAdmin();

  if (!admin) {
    return redirect("/sign-in");
  }

  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc", 
    },
    include: {
      user: true,
      shippingAddress: true,
      items: {
        include: {
          product: true,
        }
      },
      configuration: true,
    },
  });

  const totalCustomers = await prisma.user.count();
  

  const totalOrdersThatOrdered = await prisma.order.count();

  const TotalSales = await prisma.order.aggregate({
    _sum: {
      total: true
    },
  });

  const simplifiedOrders = orders.map((order) => {
    // ProductConfiguration.discount is dropped (A21): 0.00 on every production row.
    const discountRate = 0;
    const subtotal = order.subtotal;
    const shippingCost = order.shippingCost;
    const total = order.total;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      subtotal: subtotal,
      shippingCost: shippingCost,
      total: total,
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      discountRate: discountRate,
      user: {
        id: order.user.id,
        email: order.user.email,
        phoneNumber: order.user.phoneNumber,
      },
      items: order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress: order.shippingAddress
        ? {
            id: order.shippingAddress.id,
            fullName: order.shippingAddress.fullName,
          }
        : null,
    };
  });

  const result = {
    orders: simplifiedOrders,
    totalCustomers,
    totalOrdersThatOrdered,
    TotalSales: {
      _sum: {
        totalPrice: TotalSales._sum.total ?? 0,
      },
    },
    user: {
      // Better Auth stores the avatar on our own user row, so there is no provider copy to
      // read. Null until an administrator uploads one; the header falls back to an initial.
      imageUrl: admin.image ?? null,
    },
  };

  console.log("Dashboard data fetched:", {
    ordersCount: result.orders.length,
    totalCustomers: result.totalCustomers,
    totalOrders: result.totalOrdersThatOrdered,
    totalSales: result.TotalSales._sum.totalPrice,
  });
  
  return JSON.parse(JSON.stringify(result));
};
