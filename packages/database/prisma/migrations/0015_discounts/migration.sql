-- 0015  Discounts  (BUILD §13.2, the design A21 deferred)
--
-- A21 dropped `product_configurations.discount` and the two money columns beside it because
-- all three were 0.00 on every production row: they advertised a discounting capability the
-- checkout had never had. Its closing line was that when discounts arrived they should be
-- designed rather than inherited. This is the design.
--
-- A discount is an OVERLAY. `products.price` is never written by one:
--
--   * the base price is what the product costs. A discount is a period during which it costs
--     less, so writing the sale price into the column destroys the "was" half of
--     "was 1000, now 850" and leaves nothing to restore when the period ends;
--   * expiry is a fact about time rather than a job. `now()` outside [startsAt, endsAt) IS
--     the end of the discount, so no cron can fail to run and leave a sale up for a week; and
--   * bulk repricing (0008's audit trail) stays a permanent price change. A fifteen-day sale
--     pushed through it would put two entries in every product's price history for a price
--     that was never really either.
--
-- Timestamps are TIMESTAMP(3) WITHOUT time zone like every other timestamp in this schema,
-- and Prisma writes UTC into them. Anything comparing in SQL must say
-- `now() AT TIME ZONE 'UTC'` — a bare `now()` is a timestamptz and coerces through the
-- session timezone (A55, found three times in P4).

CREATE TYPE "public"."discount_kind" AS ENUM ('PERCENT', 'AMOUNT');

CREATE TYPE "public"."discount_scope_type" AS ENUM ('ALL', 'CATEGORY', 'SUB_CATEGORY', 'FAMILY', 'PRODUCTS');

CREATE TABLE "public"."discounts" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "kind"           "public"."discount_kind" NOT NULL,
    "value"          DECIMAL(12,2) NOT NULL,
    "scopeType"      "public"."discount_scope_type" NOT NULL,
    "categoryId"     TEXT,
    "subCategoryId"  TEXT,
    "familyId"       TEXT,
    "startsAt"       TIMESTAMP(3) NOT NULL,
    "endsAt"         TIMESTAMP(3) NOT NULL,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdById"    TEXT,
    "createdByEmail" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- The SKUs a PRODUCTS-scoped discount names. It exists so that "these four spotlights, half
-- price, for a week" is one discount rather than four that have to be edited in step.
CREATE TABLE "public"."discount_products" (
    "discountId" TEXT NOT NULL,
    "productId"  TEXT NOT NULL,

    CONSTRAINT "discount_products_pkey" PRIMARY KEY ("discountId", "productId")
);

ALTER TABLE "public"."discounts"
    ADD CONSTRAINT "discounts_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "discounts_subCategoryId_fkey"
        FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "discounts_familyId_fkey"
        FOREIGN KEY ("familyId") REFERENCES "public"."product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."discount_products"
    ADD CONSTRAINT "discount_products_discountId_fkey"
        FOREIGN KEY ("discountId") REFERENCES "public"."discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "discount_products_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The resolver reads exactly one shape: live rows whose window contains now.
CREATE INDEX "discounts_isActive_startsAt_endsAt_idx" ON "public"."discounts"("isActive", "startsAt", "endsAt");
CREATE INDEX "discounts_scopeType_idx" ON "public"."discounts"("scopeType");
CREATE INDEX "discount_products_productId_idx" ON "public"."discount_products"("productId");

-- A discount that takes nothing off is a row that renders a "-0%" badge on a storefront.
ALTER TABLE "public"."discounts"
    ADD CONSTRAINT "discounts_value_positive" CHECK ("value" > 0);

-- 100% off is free, which is a decision nobody makes through a percentage field by accident,
-- and `products_price_positive` exists for the same reason on the column this shadows.
ALTER TABLE "public"."discounts"
    ADD CONSTRAINT "discounts_percent_bounded" CHECK ("kind" <> 'PERCENT' OR "value" < 100);

-- Half-open [startsAt, endsAt): a zero-length window is a discount that is never live, and a
-- backwards one is a typo the resolver would silently treat as never live too.
ALTER TABLE "public"."discounts"
    ADD CONSTRAINT "discounts_window_ordered" CHECK ("endsAt" > "startsAt");

-- The scope column and the target columns cannot disagree. Without this a row can say
-- SUB_CATEGORY and carry a familyId, and the resolver has to guess which one the operator
-- meant — at which point the guess, not the data, decides what a customer pays.
ALTER TABLE "public"."discounts"
    ADD CONSTRAINT "discounts_scope_target_matches" CHECK (
        CASE "scopeType"
            WHEN 'CATEGORY'     THEN "categoryId" IS NOT NULL AND "subCategoryId" IS NULL AND "familyId" IS NULL
            WHEN 'SUB_CATEGORY' THEN "subCategoryId" IS NOT NULL AND "categoryId" IS NULL AND "familyId" IS NULL
            WHEN 'FAMILY'       THEN "familyId" IS NOT NULL AND "categoryId" IS NULL AND "subCategoryId" IS NULL
            ELSE "categoryId" IS NULL AND "subCategoryId" IS NULL AND "familyId" IS NULL
        END
    );
