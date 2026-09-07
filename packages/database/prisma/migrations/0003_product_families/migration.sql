-- 0003  Product families  (BUILD §6)
--
-- v1 grouped variants with products.baseProductId (a self-reference by SKU string) and
-- products.variantType. The storefront then re-derived the grouping at runtime with a
-- regex over SKUs. A family is an entity, not a string prefix: it has its own name in two
-- languages, its own slug, and its own ordering.
--
-- familyId is populated by the P2 transform from the VERIFIED production baseProductId,
-- never from a regex (§1.5). baseProductId and variantType are dropped in 0011.

CREATE TABLE "public"."product_families" (
    "id"            TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "variantType"   TEXT,
    "order"         INTEGER NOT NULL DEFAULT 0,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "deletedAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."product_family_translations" (
    "id"              TEXT NOT NULL,
    "familyId"        TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "metaTitle"       TEXT,
    "metaDescription" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_family_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_families_slug_key" ON "public"."product_families"("slug");
CREATE INDEX "product_families_subCategoryId_order_idx" ON "public"."product_families"("subCategoryId", "order");
CREATE INDEX "product_families_deletedAt_idx" ON "public"."product_families"("deletedAt");

CREATE UNIQUE INDEX "product_family_translations_familyId_locale_key" ON "public"."product_family_translations"("familyId", "locale");
CREATE UNIQUE INDEX "product_family_translations_locale_slug_key" ON "public"."product_family_translations"("locale", "slug");
CREATE INDEX "product_family_translations_locale_idx" ON "public"."product_family_translations"("locale");

ALTER TABLE "public"."product_families"
    ADD CONSTRAINT "product_families_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_family_translations"
    ADD CONSTRAINT "product_family_translations_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "public"."product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ON DELETE SET NULL, not CASCADE: dissolving a family must not delete its products.
ALTER TABLE "public"."products" ADD COLUMN "familyId" TEXT;

ALTER TABLE "public"."products"
    ADD CONSTRAINT "products_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "public"."product_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_familyId_displayOrder_idx" ON "public"."products"("familyId", "displayOrder");
CREATE INDEX "products_price_idx" ON "public"."products"("price");
