import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import OrderPage from "./order-page";

const OrderIdPage = async ({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    return notFound();
  }
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
    return notFound();
  }

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