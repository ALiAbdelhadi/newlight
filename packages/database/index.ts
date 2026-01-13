import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Explicitly export types and enums to avoid CommonJS export * warning
export type {
  PrismaClient,
  User,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  ShippingAddress,
  Configuration,
  Category,
  CategoryTranslation,
  SubCategory,
  SubCategoryTranslation,
  ProductTranslation,
  SystemSetting,
  ContactForm,
  ContactFormResponse,
  ContactFormTag,
  Notification,
} from "@prisma/client"

// Export Prisma namespace and enums as values
export {
  Prisma,
  ProductColorTemp,
  AvailableColors,
  ProductIP,
  OrderOption,
  OrderStatus,
  UserRole,
  CategoryType,
  ContactFormStatus,
  ContactPriority,
  NotificationType,
  NotificationPriority,
} from "@prisma/client"