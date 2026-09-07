-- 0001  Money becomes DECIMAL(12,2)  (BUILD §4)
--
-- Every monetary column in production is `double precision`. Binary floating point
-- cannot represent 0.10 exactly, so totals computed from it drift; a catalogue that
-- charges customers must not store prices in a type that cannot hold them.
--
-- Verified before writing this migration, against the production snapshot:
-- every value in every column below survives `::numeric(12,2)` unchanged, so this
-- conversion is lossless on the real data rather than merely well-intentioned.
--   products.price                  189 rows, 0 lossy, range 22 .. 13531
--   orders.{subtotal,shippingCost,tax,total}   4 rows, 0 lossy
--   order_items.price                 0 rows
--   configurations.*                 13 rows, 0 lossy
--
-- USING is explicit: PostgreSQL will not cast float8 -> numeric implicitly in ALTER.

ALTER TABLE "public"."products"
    ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2);

-- Weighted average cost (§13.6). NULL means "no cost data recorded", which is the
-- truth today; it is deliberately not 0, because 0 is a claim about margin.
ALTER TABLE "public"."products"
    ADD COLUMN "averageCost" DECIMAL(12,2);

ALTER TABLE "public"."orders"
    ALTER COLUMN "subtotal"     TYPE DECIMAL(12,2) USING "subtotal"::DECIMAL(12,2),
    ALTER COLUMN "shippingCost" TYPE DECIMAL(12,2) USING "shippingCost"::DECIMAL(12,2),
    ALTER COLUMN "tax"          TYPE DECIMAL(12,2) USING "tax"::DECIMAL(12,2),
    ALTER COLUMN "total"        TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2);

ALTER TABLE "public"."order_items"
    ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2);

ALTER TABLE "public"."configurations"
    ALTER COLUMN "configPrice"   TYPE DECIMAL(12,2) USING "configPrice"::DECIMAL(12,2),
    ALTER COLUMN "priceIncrease" TYPE DECIMAL(12,2) USING "priceIncrease"::DECIMAL(12,2),
    ALTER COLUMN "shippingPrice" TYPE DECIMAL(12,2) USING "shippingPrice"::DECIMAL(12,2),
    ALTER COLUMN "discount"      TYPE DECIMAL(12,2) USING "discount"::DECIMAL(12,2),
    ALTER COLUMN "totalPrice"    TYPE DECIMAL(12,2) USING "totalPrice"::DECIMAL(12,2);

-- BUILD §4.6 check constraint. A product priced at 0 is either a data-entry slip or a
-- giveaway nobody authorised; either way the database should refuse it rather than let
-- the storefront sell it. Verified against the snapshot first: min(price) = 22.
--
-- Prisma cannot express CHECK constraints and its `migrate diff` is blind to them, so
-- this neither shows as drift nor gets dropped by a later diff. scripts/verify-chain.mjs
-- asserts it exists after replay, because a constraint Prisma cannot see is a constraint
-- nothing else would notice going missing.
ALTER TABLE "public"."products"
    ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0);
