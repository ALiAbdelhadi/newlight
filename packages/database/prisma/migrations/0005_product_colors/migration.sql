-- 0005  Colours become a table  (BUILD §8)
--
-- v1 used the `available_colors` PostgreSQL enum on products.availableColors and a bare
-- TEXT on cart_items / order_items / configurations. Adding a sixth colour meant an enum
-- migration; the two representations could disagree; and the swatch itself lived only in
-- Tailwind class names inside a React component, so no other surface could render it.
--
-- The five keys are preserved EXACTLY (BLACK, GRAY, WHITE, GOLD, WOOD) because cart and
-- order snapshots already store those strings and must keep resolving after cutover.
--
-- hex is derived from apps/www/components/surface-color-button.tsx, which was the only
-- place the swatches existed, taking the midpoint of each Tailwind gradient:
--   BLACK  bg-black                              -> #000000
--   GRAY   from-gray-400 .. to-gray-600          -> gray-500  #6B7280
--   WHITE  from-gray-50 .. to-white              -> white     #FFFFFF
--   GOLD   from-yellow-400 via-yellow-500 ..     -> yellow-500 #EAB308
--   WOOD   from-amber-600 via-amber-700 ..       -> amber-700  #B45309
-- Names come from formatAvailableColor() in apps/www/lib/product.ts, unchanged.
--
-- Row ids are stable literals, not cuids: this is reference data that the P2 transform,
-- the seed and any later fixture all have to address by identity.

CREATE TABLE "public"."product_colors" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "hex"       TEXT NOT NULL,
    "nameEn"    TEXT NOT NULL,
    "nameAr"    TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_colors_key_key" ON "public"."product_colors"("key");

CREATE TABLE "public"."product_available_colors" (
    "productId" TEXT NOT NULL,
    "colorId"   TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_available_colors_pkey" PRIMARY KEY ("productId", "colorId")
);

CREATE INDEX "product_available_colors_colorId_idx" ON "public"."product_available_colors"("colorId");

ALTER TABLE "public"."product_available_colors"
    ADD CONSTRAINT "product_available_colors_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_available_colors"
    ADD CONSTRAINT "product_available_colors_colorId_fkey"
    FOREIGN KEY ("colorId") REFERENCES "public"."product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deferred from 0004: product_images.colorId could not reference a table that did not exist.
ALTER TABLE "public"."product_images"
    ADD CONSTRAINT "product_images_colorId_fkey"
    FOREIGN KEY ("colorId") REFERENCES "public"."product_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "public"."product_colors" ("id", "key", "hex", "nameEn", "nameAr", "order", "updatedAt") VALUES
    ('color_black', 'BLACK', '#000000', 'Black', 'أسود',  0, CURRENT_TIMESTAMP),
    ('color_gray',  'GRAY',  '#6B7280', 'Gray',  'رمادي', 1, CURRENT_TIMESTAMP),
    ('color_white', 'WHITE', '#FFFFFF', 'White', 'أبيض',  2, CURRENT_TIMESTAMP),
    ('color_gold',  'GOLD',  '#EAB308', 'Gold',  'ذهبي',  3, CURRENT_TIMESTAMP),
    ('color_wood',  'WOOD',  '#B45309', 'Wood',  'خشبي',  4, CURRENT_TIMESTAMP);
