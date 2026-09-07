-- Baseline: the production schema exactly as it stood on 2026-09-06, captured with
--   prisma migrate diff --from-empty --to-url $DIRECT_DATABASE_URL   (production, read-only)
--
-- Production has an EMPTY _prisma_migrations table: it was built with `db push` and
-- has never been migrated. This file gives the chain a real starting point. It is
-- marked applied (`prisma migrate resolve --applied`) against any database that
-- already holds this shape; it is executed only against an empty one.
--
-- Nothing here is a design decision. Every deliberate change is in 0001-0011.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."available_colors" AS ENUM ('BLACK', 'GRAY', 'WHITE', 'GOLD', 'WOOD');

-- CreateEnum
CREATE TYPE "public"."category_type" AS ENUM ('indoor', 'outdoor');

-- CreateEnum
CREATE TYPE "public"."contact_form_status" AS ENUM ('UNREAD', 'READ', 'IN_PROGRESS', 'RESPONDED', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "public"."contact_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."notification_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."notification_type" AS ENUM ('NEW_CONTACT_FORM', 'NEW_ORDER', 'ORDER_CANCELLED', 'LOW_INVENTORY', 'SYSTEM_ALERT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."order_option" AS ENUM ('BasicShipping', 'StandardShipping', 'ExpressShipping');

-- CreateEnum
CREATE TYPE "public"."order_status" AS ENUM ('awaiting_shipment', 'processing', 'shipped', 'delivered', 'fulfilled', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "public"."product_color_temp" AS ENUM ('WARM_3000K', 'COOL_4000K', 'WHITE_6500K');

-- CreateEnum
CREATE TYPE "public"."product_ip" AS ENUM ('IP20', 'IP44', 'IP54', 'IP65', 'IP68');

-- CreateEnum
CREATE TYPE "public"."shipment_event_source" AS ENUM ('WEBHOOK', 'MANUAL_SYNC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."shipment_status" AS ENUM ('PENDING', 'CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."shipping_provider" AS ENUM ('BOSTA');

-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "public"."cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selectedColorTemp" TEXT,
    "selectedColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "categoryType" "public"."category_type" NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category_translations" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."configurations" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "configPrice" DOUBLE PRECISION NOT NULL,
    "priceIncrease" DOUBLE PRECISION NOT NULL,
    "shippingPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lampPriceIncrease" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "selectedColorTemp" TEXT,
    "selectedColor" TEXT,
    "productIp" "public"."product_ip",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_form_responses" (
    "id" TEXT NOT NULL,
    "contactFormId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_form_tags" (
    "id" TEXT NOT NULL,
    "contactFormId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_form_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contact_forms" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobPosition" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT,
    "status" "public"."contact_form_status" NOT NULL DEFAULT 'UNREAD',
    "source" TEXT NOT NULL DEFAULT 'website',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readBy" TEXT,
    "priority" "public"."contact_priority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "priority" "public"."notification_priority" NOT NULL DEFAULT 'NORMAL',
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedColorTemp" "public"."product_color_temp",
    "selectedColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configurationId" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION,
    "total" DOUBLE PRECISION NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "public"."order_status" NOT NULL DEFAULT 'awaiting_shipment',
    "shippingOption" "public"."order_option" NOT NULL DEFAULT 'StandardShipping',
    "paymentMethod" TEXT,
    "paymentStatus" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippingAddressId" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configurationId" TEXT,
    "shipmentAutoCreationError" TEXT,
    "shipmentAutoCreationFailed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_translations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metaTitle" TEXT,
    "specifications" JSONB,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseProductId" TEXT,
    "variantType" TEXT,
    "variantValue" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "colorImageMap" JSONB,
    "price" DOUBLE PRECISION NOT NULL,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[],
    "voltage" TEXT,
    "maxWattage" DOUBLE PRECISION,
    "brandOfLed" TEXT,
    "luminousFlux" TEXT,
    "mainMaterial" TEXT,
    "cri" TEXT,
    "beamAngle" INTEGER,
    "productDimensions" TEXT,
    "lightingType" TEXT,
    "driver" TEXT,
    "holeSize" TEXT,
    "powerFactor" TEXT,
    "colorTemperatures" "public"."product_color_temp"[],
    "ipRating" "public"."product_ip",
    "maxIpRating" "public"."product_ip",
    "lifeTime" INTEGER,
    "availableColors" "public"."available_colors"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipment_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "provider" "public"."shipping_provider" NOT NULL,
    "providerShipmentId" TEXT NOT NULL,
    "status" "public"."shipment_status" NOT NULL,
    "statusCode" TEXT,
    "description" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "source" "public"."shipment_event_source" NOT NULL DEFAULT 'WEBHOOK',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "public"."shipping_provider" NOT NULL,
    "providerShipmentId" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "status" "public"."shipment_status" NOT NULL DEFAULT 'PENDING',
    "statusDetail" TEXT,
    "eta" TIMESTAMP(3),
    "lastProviderStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "recipientAddress" TEXT,
    "recipientCity" TEXT,
    "recipientZone" TEXT,
    "codAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Egypt',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sub_categories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sub_category_translations" (
    "id" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'ar',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'EGP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configurationId" TEXT,
    "productId" TEXT,
    "shippingAddressId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "public"."cart_items"("cartId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_selectedColorTemp_selectedColor_key" ON "public"."cart_items"("cartId" ASC, "productId" ASC, "selectedColorTemp" ASC, "selectedColor" ASC);

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "public"."cart_items"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "public"."carts"("userId" ASC);

-- CreateIndex
CREATE INDEX "categories_categoryType_idx" ON "public"."categories"("categoryType" ASC);

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "public"."categories"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_locale_key" ON "public"."category_translations"("categoryId" ASC, "locale" ASC);

-- CreateIndex
CREATE INDEX "category_translations_locale_idx" ON "public"."category_translations"("locale" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "configurations_key_key" ON "public"."configurations"("key" ASC);

-- CreateIndex
CREATE INDEX "contact_form_responses_contactFormId_idx" ON "public"."contact_form_responses"("contactFormId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "contact_form_tags_contactFormId_tag_key" ON "public"."contact_form_tags"("contactFormId" ASC, "tag" ASC);

-- CreateIndex
CREATE INDEX "contact_forms_createdAt_idx" ON "public"."contact_forms"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "contact_forms_email_idx" ON "public"."contact_forms"("email" ASC);

-- CreateIndex
CREATE INDEX "contact_forms_isRead_idx" ON "public"."contact_forms"("isRead" ASC);

-- CreateIndex
CREATE INDEX "contact_forms_status_createdAt_idx" ON "public"."contact_forms"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type" ASC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "public"."notifications"("userId" ASC, "isRead" ASC);

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "public"."order_items"("orderId" ASC);

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "public"."order_items"("productId" ASC);

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "public"."orders"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "public"."orders"("idempotencyKey" ASC);

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "public"."orders"("orderNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "public"."orders"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "public"."orders"("status" ASC);

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "public"."orders"("userId" ASC);

-- CreateIndex
CREATE INDEX "product_translations_locale_idx" ON "public"."product_translations"("locale" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_productId_locale_key" ON "public"."product_translations"("productId" ASC, "locale" ASC);

-- CreateIndex
CREATE INDEX "products_baseProductId_idx" ON "public"."products"("baseProductId" ASC);

-- CreateIndex
CREATE INDEX "products_isActive_isFeatured_idx" ON "public"."products"("isActive" ASC, "isFeatured" ASC);

-- CreateIndex
CREATE INDEX "products_productId_idx" ON "public"."products"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_productId_key" ON "public"."products"("productId" ASC);

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "public"."products"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug" ASC);

-- CreateIndex
CREATE INDEX "products_subCategoryId_idx" ON "public"."products"("subCategoryId" ASC);

-- CreateIndex
CREATE INDEX "shipment_events_shipmentId_eventTime_idx" ON "public"."shipment_events"("shipmentId" ASC, "eventTime" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_events_shipmentId_status_eventTime_key" ON "public"."shipment_events"("shipmentId" ASC, "status" ASC, "eventTime" ASC);

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "public"."shipments"("orderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_provider_key" ON "public"."shipments"("orderId" ASC, "provider" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_provider_providerShipmentId_key" ON "public"."shipments"("provider" ASC, "providerShipmentId" ASC);

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "public"."shipments"("status" ASC);

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "public"."shipments"("trackingNumber" ASC);

-- CreateIndex
CREATE INDEX "shipping_addresses_isDefault_idx" ON "public"."shipping_addresses"("isDefault" ASC);

-- CreateIndex
CREATE INDEX "shipping_addresses_userId_idx" ON "public"."shipping_addresses"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_addresses_userId_key" ON "public"."shipping_addresses"("userId" ASC);

-- CreateIndex
CREATE INDEX "sub_categories_categoryId_idx" ON "public"."sub_categories"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_categoryId_slug_key" ON "public"."sub_categories"("categoryId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "sub_categories_slug_idx" ON "public"."sub_categories"("slug" ASC);

-- CreateIndex
CREATE INDEX "sub_category_translations_locale_idx" ON "public"."sub_category_translations"("locale" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sub_category_translations_subCategoryId_locale_key" ON "public"."sub_category_translations"("subCategoryId" ASC, "locale" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key" ASC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_shippingAddressId_key" ON "public"."users"("shippingAddressId" ASC);

-- AddForeignKey
ALTER TABLE "public"."cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_form_responses" ADD CONSTRAINT "contact_form_responses_contactFormId_fkey" FOREIGN KEY ("contactFormId") REFERENCES "public"."contact_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contact_form_tags" ADD CONSTRAINT "contact_form_tags_contactFormId_fkey" FOREIGN KEY ("contactFormId") REFERENCES "public"."contact_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "public"."shipping_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_translations" ADD CONSTRAINT "product_translations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "public"."shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_addresses" ADD CONSTRAINT "shipping_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sub_category_translations" ADD CONSTRAINT "sub_category_translations_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "public"."configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

