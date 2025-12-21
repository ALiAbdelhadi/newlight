"use server";

import { OrderStatus, prisma } from "@repo/database";
import { revalidatePath } from "next/cache";

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
  revalidatePath("/admin/dashboard/orders");
  revalidatePath("/admin/dashboard");
};
