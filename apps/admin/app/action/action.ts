"use server";

import { OrderService } from "@/lib/services/order-service";
import { OrderStatus } from "@repo/database";

export const changeOrderStatus = async ({ id, newStatus }: {
  id: string;
  newStatus: OrderStatus;
}) => {
  return OrderService.updateOrderStatus(id, newStatus)
}