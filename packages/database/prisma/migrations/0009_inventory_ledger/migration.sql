-- 0009  Inventory becomes a ledger  (BUILD §13, amendment A9/N1)
--
-- v1 had products.inventory: a single mutable integer. It could not answer "why is this 3
-- and not 5", a concurrent checkout could lose a decrement, and nothing distinguished a
-- sale from a damaged unit from a stock correction.
--
-- v2 is append-only movements plus a derived level. packages/database/inventory.ts is the
-- ONLY writer; the movement insert and the level update share one transaction, so a level
-- that disagrees with the sum of its movements is unreachable rather than merely unlikely.
--
-- unitCost is nullable and NEVER zero: NULL means "cost not recorded", 0 means "free",
-- and conflating them silently overstates margin.
--
-- ON DELETE RESTRICT on stock_movements.productId is deliberate. A product with movement
-- history cannot be deleted — it is soft-deleted (deletedAt, 0002). Deleting the product
-- would destroy the record of stock that physically moved.
--
-- N1: all 189 products carry a seeded inventory = 5000, which is fiction. The P2 transform
-- writes 189 INITIAL movements with unitCost = NULL and the mandatory reason
-- "migrated placeholder — not a physical count", and sets the SystemSetting flag
-- inventory.opening_count_pending. That flag is NOT set here: on an empty database there
-- is no placeholder to disclose, and a flag that is true by construction stops being read.

CREATE TYPE "public"."movement_type" AS ENUM (
    'INITIAL', 'PURCHASE_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE'
);

CREATE TABLE "public"."locations" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."stock_movements" (
    "id"            TEXT NOT NULL,
    "productId"     TEXT NOT NULL,
    "locationId"    TEXT NOT NULL,
    "type"          "public"."movement_type" NOT NULL,
    "quantity"      INTEGER NOT NULL,
    "unitCost"      DECIMAL(12,2),
    "reason"        TEXT,
    "referenceType" TEXT,
    "referenceId"   TEXT,
    "actorType"     "public"."actor_type",
    "actorId"       TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- (productId, locationId, createdAt) is the ledger replay order; (referenceType,
-- referenceId) is how a retried order event finds its own prior movement and stays
-- idempotent (F5); (type, createdAt) is the reporting axis.
CREATE INDEX "stock_movements_productId_locationId_createdAt_idx" ON "public"."stock_movements"("productId", "locationId", "createdAt");
CREATE INDEX "stock_movements_referenceType_referenceId_idx" ON "public"."stock_movements"("referenceType", "referenceId");
CREATE INDEX "stock_movements_type_createdAt_idx" ON "public"."stock_movements"("type", "createdAt");

CREATE TABLE "public"."stock_levels" (
    "productId"  TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "onHand"     INTEGER NOT NULL DEFAULT 0,
    "reserved"   INTEGER NOT NULL DEFAULT 0,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("productId", "locationId")
);

CREATE INDEX "stock_levels_locationId_idx" ON "public"."stock_levels"("locationId");

ALTER TABLE "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One physical location exists today. Stable literal id for the same reason as the colours
-- in 0005: the transform and every fixture address it by identity.
INSERT INTO "public"."locations" ("id", "name", "isDefault", "updatedAt")
VALUES ('location_main', 'Main Warehouse', true, CURRENT_TIMESTAMP);

-- A partial unique index on ("isDefault") WHERE "isDefault" would enforce "exactly one
-- default location" in the database, and it is deliberately NOT created: Prisma cannot
-- express a partial index, so it would show as permanent drift and every future
-- `migrate diff` would propose dropping it. The invariant is enforced in
-- packages/database/inventory.ts instead, which is the only writer.

-- BUILD §4.6 check constraints. These are the ledger's arithmetic made unbreakable:
-- negative stock is not a state the warehouse can be in, and reserving more than is on
-- hand is the oversell this subsystem exists to prevent. inventory.ts checks the same
-- things, but a check in application code protects one code path and a check here
-- protects the database.
ALTER TABLE "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_on_hand_non_negative"  CHECK ("onHand" >= 0),
    ADD CONSTRAINT "stock_levels_reserved_non_negative" CHECK ("reserved" >= 0),
    ADD CONSTRAINT "stock_levels_reserved_within_stock" CHECK ("reserved" <= "onHand");
