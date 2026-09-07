-- 0002  Per-locale taxonomy slugs, SEO fields, soft-delete  (BUILD §9.2, §14.6, amendment A6)
--
-- v1 kept one slug on the entity, so an Arabic URL was impossible: /ar/category/indoor
-- served Arabic content under an English path. In v2 the slug lives on the translation
-- row and is unique per (locale, slug), so the two languages address the same entity by
-- different, independent paths.
--
-- The slug columns are created NULLABLE here on purpose. Real values are written by the
-- P2 transform (Arabic slugs are generated from the Arabic names by the A6 normalisation
-- rule); 0011 sets them NOT NULL once they are populated. Adding a NOT NULL column to a
-- populated table with an invented default is how migrations manufacture wrong data.
--
-- The (locale, slug) unique index is created now rather than in 0011: PostgreSQL treats
-- NULLs as distinct, so it is satisfiable while the column is empty AND it makes the
-- transform fail loudly on the first duplicate slug instead of silently overwriting.

ALTER TABLE "public"."category_translations"
    ADD COLUMN "slug"            TEXT,
    ADD COLUMN "metaTitle"       TEXT,
    ADD COLUMN "metaDescription" TEXT;

ALTER TABLE "public"."sub_category_translations"
    ADD COLUMN "slug"            TEXT,
    ADD COLUMN "metaTitle"       TEXT,
    ADD COLUMN "metaDescription" TEXT;

CREATE UNIQUE INDEX "category_translations_locale_slug_key"
    ON "public"."category_translations"("locale", "slug");

CREATE UNIQUE INDEX "sub_category_translations_locale_slug_key"
    ON "public"."sub_category_translations"("locale", "slug");

-- Soft delete (§14). A category with orders behind it must never be hard-deleted;
-- deletedAt is the only lifecycle mechanism, and every read path filters on it.
ALTER TABLE "public"."categories"     ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "public"."sub_categories" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "public"."products"       ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "categories_deletedAt_idx"     ON "public"."categories"("deletedAt");
CREATE INDEX "sub_categories_deletedAt_idx" ON "public"."sub_categories"("deletedAt");
CREATE INDEX "products_deletedAt_idx"       ON "public"."products"("deletedAt");

-- v2 orders categories by (isActive, order) and sub-categories by (categoryId, order);
-- the v1 indexes that no longer match a query path are dropped with their columns in 0011.
CREATE INDEX "categories_isActive_order_idx"    ON "public"."categories"("isActive", "order");
CREATE INDEX "sub_categories_categoryId_order_idx" ON "public"."sub_categories"("categoryId", "order");
