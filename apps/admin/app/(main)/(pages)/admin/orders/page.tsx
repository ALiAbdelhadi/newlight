import { currentAdmin, currentAdminId, requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrdersClient from "./orders-client";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const OrdersPage = async () => {
  // One guard, replacing the signed-in check plus the ADMIN_EMAIL comparison.
  const admin = await requireCurrentAdmin();
  const userId = admin.id;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          preferredLanguage: true,
          preferredCurrency: true,
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