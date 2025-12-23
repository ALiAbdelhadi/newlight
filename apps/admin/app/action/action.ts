"use server";

import { OrderStatus, prisma } from "@repo/database";

export const changeOrderStatus = async ({
  id,
  newStatus,
}: {
  id: string;
  newStatus: OrderStatus;
}) => {
  await prisma.order.update({
    where: { id },
    data: { status: newStatus },
  });
};
