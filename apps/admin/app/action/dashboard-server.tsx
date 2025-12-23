"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";

export const DashboardServer = async () => {
  const user = await currentUser();
  const { userId } = await auth();

  if (!userId || !user) {
    return redirect("/404");
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
    const discountRate = order.configuration?.discount ?? 0;
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
      imageUrl: user.imageUrl,
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
