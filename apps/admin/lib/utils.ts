import { OrderStatus } from "@repo/database"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const STATUS_CLASS_MAP: Record<OrderStatus, string> = {
  cancelled: "bg-red-500 text-white hover:bg-red-600",
  processing: "bg-yellow-500 text-white hover:bg-yellow-600",
  fulfilled: "bg-green-500 text-white hover:bg-green-600",
  awaiting_shipment: "bg-blue-500 text-white hover:bg-blue-600",
  shipped: "bg-indigo-500 text-white hover:bg-indigo-600",
  delivered: "bg-emerald-600 text-white hover:bg-emerald-700",
  refunded: "bg-gray-500 text-white hover:bg-gray-600",
}

export const getStatusBadgeClassName = (status: OrderStatus) => {
  return STATUS_CLASS_MAP[status]
}

export const LABEL_MAP: Record<OrderStatus, string> = {
  awaiting_shipment: "Awaiting Shipment",
  processing: "Processing",
  cancelled: "Cancelled",
  fulfilled: "Fulfilled",
  shipped: "Shipped",
  delivered: "Delivered",
  refunded: "Refunded",
}