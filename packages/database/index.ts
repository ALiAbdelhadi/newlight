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
  EmailOutbox,
  Session,
  Account,
  Verification,
} from "@prisma/client"

// Export Prisma namespace and enums as values
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
} from "@prisma/client"
// ---------------------------------------------------------------------------
// Domain boundaries (BUILD §4, §7, §9, §13)
//
// Each of these is the ONLY correct implementation of a cross-cutting rule that v1
// re-implemented differently in every app. They live in @repo/database rather than in an
// app because both apps must agree: a price formatted one way in the storefront and
// another in the admin is two answers to one question.
// ---------------------------------------------------------------------------
export * from "./money"
export * from "./locale"
export * from "./translation"
export * from "./slug"
export * from "./inventory"

// The v1 -> v2 specification dictionary. Transform-scoped, exported so the audit script
// and the transform cannot drift from one another.
export * from "./spec-map"

// The order state machine (§12, ADR 0005). Exported from here, not from an app, because the
// admin performs most transitions and a machine declared twice is not one machine.
export * from "./order-state-machine"

// Inventory and order reporting (§13). Derived from the ledger, never from a cached column.
export * from "./reporting"

// Shipping rates (§13.2). Settings rather than a literal in the checkout path, so the admin
// panel's Shipping screen has something real to edit.
export * from "./shipping"

// Shared rate-limit counters (§security). In a table rather than a Map, because a Map is
// per-instance and a cold start forgives every caller.
export * from "./rate-limit"
