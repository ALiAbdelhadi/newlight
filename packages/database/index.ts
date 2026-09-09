import { createPrismaClient } from "./prisma-client"

import type { PrismaClient } from "./generated/prisma/client"

declare global {
  var __prisma: PrismaClient | undefined
}

let client: PrismaClient | undefined

function resolveClient(): PrismaClient {
  if (client) return client
  client = globalThis.__prisma ?? createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalThis.__prisma = client
  return client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const resolved = resolveClient()
    const value = Reflect.get(resolved, property) as unknown
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(resolved) : value
  },
  has(_target, property) {
    return Reflect.has(resolveClient(), property)
  },
})

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
} from "./generated/prisma/client"

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
} from "./generated/prisma/client"
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
export * from "./prisma-client"
