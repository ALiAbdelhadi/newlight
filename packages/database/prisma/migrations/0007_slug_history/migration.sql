-- 0007  Slug history  (BUILD §10)
--
-- Slugs are user-visible URLs. Renaming a product or a category in the admin currently
-- breaks every inbound link and every indexed page silently. These two tables are the
-- record that lets a retired slug answer with a 301 instead of a 404.
--
-- Product slugs are shared across locales (§9.3), so product_slug_history is keyed by
-- slug alone. Taxonomy slugs are per-locale (0002), so taxonomy_slug_history is keyed by
-- (locale, slug) and names the entity type explicitly rather than through three nullable
-- foreign keys.
--
-- Nothing writes these tables yet; the writers are the admin rename paths in P5. Shipping
-- the tables first means the rename path has somewhere to write on the day it is built.

CREATE TABLE "public"."product_slug_history" (
    "id"        TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_slug_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_slug_history_slug_key" ON "public"."product_slug_history"("slug");
CREATE INDEX "product_slug_history_productId_idx" ON "public"."product_slug_history"("productId");

ALTER TABLE "public"."product_slug_history"
    ADD CONSTRAINT "product_slug_history_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "public"."taxonomy_entity_type" AS ENUM ('CATEGORY', 'SUB_CATEGORY', 'PRODUCT_FAMILY');

CREATE TABLE "public"."taxonomy_slug_history" (
    "id"         TEXT NOT NULL,
    "locale"     TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "entityType" "public"."taxonomy_entity_type" NOT NULL,
    "entityId"   TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxonomy_slug_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxonomy_slug_history_locale_slug_key" ON "public"."taxonomy_slug_history"("locale", "slug");
CREATE INDEX "taxonomy_slug_history_entityType_entityId_idx" ON "public"."taxonomy_slug_history"("entityType", "entityId");
