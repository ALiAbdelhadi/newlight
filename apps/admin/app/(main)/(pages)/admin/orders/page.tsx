import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrdersClient from "./orders-client";

const OrdersPage = async () => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    return notFound();
  }
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
    return notFound();
  }
  
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
      shippingAddress: true,
      items: {
        include: {
          product: {
            include: {
              translations: {
                take: 1,
              },
            },
          },
          configuration: true,
        },
      },
      configuration: true,
    },
  });

  return <OrdersClient orders={orders} />;
};

export default OrdersPage;
