import { currentAdmin, currentAdminId, requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrderPage from "./order-page";

const OrderIdPage = async ({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) => {
  // One guard, replacing the signed-in check plus the ADMIN_EMAIL comparison.
  const admin = await requireCurrentAdmin();
  const userId = admin.id;

  const resolvedParams = await params;
  const order = await prisma.order.findUnique({
    where: {
      id: resolvedParams.orderId,
    },
    include: {
      shippingAddress: true,
      user: {
        select: {
          id: true,
          email: true,
          phoneNumber: true,
        },
      },
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

  if (!order) {
    return notFound();
  }

  return <OrderPage order={order} />;
};

export default OrderIdPage;