import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export type {
  PrismaClient,
  User,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  ShippingAddress,
  ProductConfiguration,
  Category,
  CategoryTranslation,
  SubCategory,
  SubCategoryTranslation,
  ProductTranslation,
  SystemSetting,
  ProductFamily,
  ProductFamilyTranslation,
  ProductImage,
  ProductColor,
  ProductAvailableColor,
  SpecDefinition,
  SubCategorySpec,
  ProductSpec,
  ProductSlugHistory,
  TaxonomySlugHistory,
  AdminAuditLog,
  Location,
  StockMovement,
  StockLevel,
  ContactForm,
  ContactFormResponse,
  ContactFormTag,
  Notification,
  PushSubscription,
  EmailOutbox,
  Discount,
  DiscountProduct,
  Session,
  Account,
  Verification,
} from "@prisma/client"

export {
  Prisma,
  ProductColorTemp,
  OrderOption,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ActorType,
  SpecValueType,
  TaxonomyEntityType,
  MovementType,
  ContactFormStatus,
  ContactPriority,
  NotificationType,
  NotificationPriority,
  EmailStatus,
  UserRole,
  DiscountKind,
  DiscountScopeType,
} from "@prisma/client"
export * from "./money"
export * from "./locale"
export * from "./translation"
export * from "./slug"
export * from "./inventory"

export * from "./pricing"

export * from "./spec-map"

export * from "./order-state-machine"

export * from "./status"

export * from "./reporting"

export * from "./shipping"

export * from "./rate-limit"
