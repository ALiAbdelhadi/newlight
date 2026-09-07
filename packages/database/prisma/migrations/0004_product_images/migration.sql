-- 0004  Product images  (BUILD §5)
--
-- v1 stored images as products.images TEXT[] plus a products.colorImageMap JSONB. An array
-- cannot carry dimensions, alt text, or a blur placeholder, and the JSONB map duplicated
-- the colour association in a second, unvalidated place.
--
-- There is deliberately NO isPrimary flag. order = 0 IS the primary image, so primacy
-- cannot drift out of sync with ordering, and "two primary images" is unrepresentable.
--
-- Rows are written by the P2 media walker, which resolves every v1 path against the union
-- of apps/www/public/products and apps/admin/public/products (amendment A5) and uploads to
-- Cloudinary. publicId is the Cloudinary identity; url is the delivery URL.

CREATE TABLE "public"."product_images" (
    "id"          TEXT NOT NULL,
    "productId"   TEXT NOT NULL,
    "url"         TEXT NOT NULL,
    "publicId"    TEXT NOT NULL,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "colorId"     TEXT,
    "width"       INTEGER,
    "height"      INTEGER,
    "blurDataUrl" TEXT,
    "altEn"       TEXT,
    "altAr"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_images_productId_order_idx" ON "public"."product_images"("productId", "order");
CREATE INDEX "product_images_colorId_idx" ON "public"."product_images"("colorId");

ALTER TABLE "public"."product_images"
    ADD CONSTRAINT "product_images_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
