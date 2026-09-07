-- 0010  Order lifecycle, payment enums, configuration identity  (BUILD §12, F1-F5, Q4)
--
-- Four groups of change, all verified against the production snapshot first.

-- ---------------------------------------------------------------------------
-- 1. The unbuilt courier integration is removed  (amendment A7)
--
-- shipments, shipment_events and their three enums exist in production with 0 rows and
-- no code that reads or writes them. Keeping empty tables for an integration that was
-- never built means every future reader has to work out whether they are live.
--
-- Bosta is a confirmed future workstream, so the FOUNDATIONS ship instead (F1-F5):
-- actor_type including WEBHOOK (0008), and orders keeping exactly what manual COD needs.
-- A future Shipment/ShipmentEvent pair is then purely additive rather than a rewrite.
-- ---------------------------------------------------------------------------

DROP TABLE "public"."shipment_events";
DROP TABLE "public"."shipments";
DROP TYPE "public"."shipment_event_source";
DROP TYPE "public"."shipment_status";
DROP TYPE "public"."shipping_provider";

-- Dead flags from the same never-built integration.
ALTER TABLE "public"."orders"
    DROP COLUMN "shipmentAutoCreationError",
    DROP COLUMN "shipmentAutoCreationFailed";

-- Declared in v1, never given a column. Roles come from Clerk.
DROP TYPE "public"."user_role";

-- ---------------------------------------------------------------------------
-- 2. Payment method and status become enums
--
-- Both are TEXT in v1 and NULL on all 4 production orders, so the application had no way
-- to tell "not recorded" from "not paid". All 4 orders are cancelled COD orders that were
-- never paid, so COD / PENDING is the accurate reading of them, not a convenient one.
--
-- PaymentStatus.PAID means MONEY RECEIVED BY THE MERCHANT, nothing weaker (F4). Under COD
-- the courier holds the cash after delivery, so delivery is NOT payment. The mapping lives
-- in exactly one function, settlePaymentForDelivery(), and is never inlined into the
-- delivered transition — which is what makes adding COLLECTED / SETTLED later an enum
-- addition rather than a semantic rewrite of every call site.
-- ---------------------------------------------------------------------------

DO $$
DECLARE unexpected INT;
BEGIN
    SELECT count(*) INTO unexpected FROM "public"."orders"
     WHERE ("paymentMethod" IS NOT NULL AND "paymentMethod" <> 'COD')
        OR ("paymentStatus" IS NOT NULL AND "paymentStatus" NOT IN ('PENDING','PAID','REFUNDED','FAILED'));
    IF unexpected > 0 THEN
        RAISE EXCEPTION 'refusing to convert: % order(s) hold a payment value outside the v2 enums', unexpected;
    END IF;
END $$;

CREATE TYPE "public"."payment_method" AS ENUM ('COD');
CREATE TYPE "public"."payment_status" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

UPDATE "public"."orders" SET "paymentMethod" = 'COD'     WHERE "paymentMethod" IS NULL;
UPDATE "public"."orders" SET "paymentStatus" = 'PENDING' WHERE "paymentStatus" IS NULL;

ALTER TABLE "public"."orders"
    ALTER COLUMN "paymentMethod" TYPE "public"."payment_method" USING "paymentMethod"::"public"."payment_method",
    ALTER COLUMN "paymentMethod" SET NOT NULL,
    ALTER COLUMN "paymentMethod" SET DEFAULT 'COD',
    ALTER COLUMN "paymentStatus" TYPE "public"."payment_status" USING "paymentStatus"::"public"."payment_status",
    ALTER COLUMN "paymentStatus" SET NOT NULL,
    ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

-- ---------------------------------------------------------------------------
-- 3. order_status loses the three values nothing ever used
--
-- processing / fulfilled / refunded: no production row holds them and no live code assigns
-- them. A status nothing can reach is a status every reader still has to handle.
-- PostgreSQL cannot remove enum values, so the type is rebuilt.
-- ---------------------------------------------------------------------------

DO $$
DECLARE stranded INT;
BEGIN
    SELECT count(*) INTO stranded FROM "public"."orders"
     WHERE status::text IN ('processing', 'fulfilled', 'refunded');
    IF stranded > 0 THEN
        RAISE EXCEPTION 'refusing to prune order_status: % order(s) still hold a removed value', stranded;
    END IF;
END $$;

ALTER TYPE "public"."order_status" RENAME TO "order_status_v1";
CREATE TYPE "public"."order_status" AS ENUM ('awaiting_shipment', 'shipped', 'delivered', 'cancelled');

ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."orders"
    ALTER COLUMN "status" TYPE "public"."order_status" USING "status"::text::"public"."order_status";
ALTER TABLE "public"."orders" ALTER COLUMN "status" SET DEFAULT 'awaiting_shipment';

DROP TYPE "public"."order_status_v1";

-- Index the pair the admin queue actually reads, and payment status, which nothing could
-- filter on before. orders_orderNumber_idx duplicated the unique constraint's own index.
DROP INDEX "public"."orders_orderNumber_idx";
DROP INDEX "public"."orders_status_idx";
CREATE INDEX "orders_status_createdAt_idx" ON "public"."orders"("status", "createdAt");
CREATE INDEX "orders_paymentStatus_idx" ON "public"."orders"("paymentStatus");

-- One address per user (shipping_addresses.userId is already UNIQUE), so an index on a
-- two-valued flag over one row per user can never be selective.
DROP INDEX "public"."shipping_addresses_isDefault_idx";

-- ---------------------------------------------------------------------------
-- 4. Colour keys, and ProductConfiguration finally references a product
--
-- selectedColor -> selectedColorKey everywhere: the value is a stable ProductColor.key
-- snapshot, deliberately NOT a foreign key, so retiring a colour cannot rewrite what a
-- customer already ordered.
--
-- THE DEFECT: configurations."productId" did not hold a product id. All 13 production
-- rows hold a SKU — it joins to products."productId" 13/13 and to products.id 0/13. So
-- v1's Configuration -> Product relation never resolved for a single row; anything that
-- tried to load a configuration's product got nothing. Q4 asks for a real FK plus a
-- denormalised SKU, and that is exactly what repairs this: the old column is renamed to
-- productSku (which is what it always was) and a real productId is resolved through it.
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."cart_items" RENAME COLUMN "selectedColor" TO "selectedColorKey";
ALTER TABLE "public"."order_items" RENAME COLUMN "selectedColor" TO "selectedColorKey";

-- cart_items.selectedColorTemp was TEXT while order_items.selectedColorTemp was already
-- the enum: the same value was validated on one table and not the other.
ALTER TABLE "public"."cart_items"
    ALTER COLUMN "selectedColorTemp" TYPE "public"."product_color_temp"
    USING "selectedColorTemp"::"public"."product_color_temp";

-- The model is renamed to ProductConfiguration (BUILD §3): "Configuration" reads like
-- application settings, which is exactly the confusion that let a settings-shaped
-- key/value/description/isPublic quartet grow on a checkout table. Renaming first means
-- every index below is created with its final name.
ALTER TABLE "public"."configurations" RENAME TO "product_configurations";
ALTER TABLE "public"."product_configurations" RENAME CONSTRAINT "configurations_pkey" TO "product_configurations_pkey";

ALTER TABLE "public"."product_configurations" RENAME COLUMN "selectedColor" TO "selectedColorKey";

-- Leftovers from an abandoned design in which configurations doubled as a settings table.
ALTER TABLE "public"."product_configurations"
    DROP COLUMN "key",
    DROP COLUMN "value",
    DROP COLUMN "description",
    DROP COLUMN "isPublic",
    DROP COLUMN "lampPriceIncrease",
    DROP COLUMN "productIp";

-- Money columns that are 0.00 on all 13 rows and are never written with anything else.
-- Verified before writing this: priceIncrease, shippingPrice and discount each have 0 rows
-- with a non-zero value, and configPrice == totalPrice on every row. Carrying three always
-- zero money columns forward would advertise a discounting capability the checkout has
-- never had; when discounts arrive they should be designed, not inherited.
ALTER TABLE "public"."product_configurations"
    DROP COLUMN "priceIncrease",
    DROP COLUMN "shippingPrice",
    DROP COLUMN "discount";

ALTER TABLE "public"."product_configurations" RENAME COLUMN "productId" TO "productSku";
ALTER TABLE "public"."product_configurations" ADD COLUMN "productId" TEXT;

UPDATE "public"."product_configurations" c
   SET "productId" = p."id"
  FROM "public"."products" p
 WHERE p."productId" = c."productSku";

DO $$
DECLARE unresolved INT;
BEGIN
    SELECT count(*) INTO unresolved FROM "public"."product_configurations" WHERE "productId" IS NULL;
    IF unresolved > 0 THEN
        RAISE EXCEPTION 'refusing to add the FK: % configuration(s) name a SKU with no product', unresolved;
    END IF;
END $$;

ALTER TABLE "public"."product_configurations" ALTER COLUMN "productId" SET NOT NULL;

-- RESTRICT, not CASCADE: a configuration is live checkout state and orders point at it.
-- Deleting the product must fail rather than quietly destroy an order's provenance.
ALTER TABLE "public"."product_configurations"
    ADD CONSTRAINT "product_configurations_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "product_configurations_productId_idx" ON "public"."product_configurations"("productId");
CREATE INDEX "product_configurations_createdAt_idx" ON "public"."product_configurations"("createdAt");
