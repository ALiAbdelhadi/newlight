-- 0011  Drop the v1 catalog columns  (BUILD §2.1, amendment A12)
--
-- *** THIS MIGRATION IS DESTRUCTIVE AND IS NOT SCHEMA-REVERSIBLE. ***
--
-- It runs ONLY AFTER the P2 transform has moved this data into the tables created by
-- 0003-0006. Everything dropped here is the SOURCE the transform reads, so applying it
-- early destroys the input. The guard below enforces that ordering rather than trusting
-- it: on a database that still holds v1 catalog data with no v2 rows to show for it, this
-- migration refuses to run.
--
-- Per amendment A12 no down-SQL is written. The columns hold data, not just shape, so a
-- reversal would have to fabricate it. The recovery path is Neon PITR / restore, which is
-- a real recovery rather than a checklist item — and which is exactly why §20 condition 5
-- (confirmed PITR retention) blocks cutover.

DO $$
DECLARE
    v1_rows INT;
    v2_specs INT;
    v2_images INT;
BEGIN
    SELECT count(*) INTO v1_rows FROM "public"."products";
    IF v1_rows = 0 THEN
        RETURN;  -- fresh database: nothing to transform, nothing to protect
    END IF;

    SELECT count(*) INTO v2_specs  FROM "public"."product_specs";
    SELECT count(*) INTO v2_images FROM "public"."product_images";

    IF v2_specs = 0 OR v2_images = 0 THEN
        RAISE EXCEPTION
            'refusing to drop v1 catalog columns: % product(s) exist but product_specs=% and product_images=%. Run the P2 transform first.',
            v1_rows, v2_specs, v2_images;
    END IF;
END $$;

-- The per-locale slugs added (nullable) in 0002 are populated by the transform. Making
-- them NOT NULL here is the point at which "every taxonomy row is addressable in both
-- languages" stops being an aspiration and becomes a constraint.
ALTER TABLE "public"."category_translations"     ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "public"."sub_category_translations" ALTER COLUMN "slug" SET NOT NULL;

-- The 15 specification columns -> product_specs.
ALTER TABLE "public"."products"
    DROP COLUMN "voltage",
    DROP COLUMN "maxWattage",
    DROP COLUMN "brandOfLed",
    DROP COLUMN "luminousFlux",
    DROP COLUMN "mainMaterial",
    DROP COLUMN "cri",
    DROP COLUMN "beamAngle",
    DROP COLUMN "productDimensions",
    DROP COLUMN "lightingType",
    DROP COLUMN "driver",
    DROP COLUMN "holeSize",
    DROP COLUMN "powerFactor",
    DROP COLUMN "ipRating",
    DROP COLUMN "maxIpRating",
    DROP COLUMN "lifeTime";

-- images TEXT[] + colorImageMap JSONB -> product_images.
-- availableColors enum[]              -> product_available_colors.
-- inventory INT                       -> stock_movements / stock_levels.
-- baseProductId + variantType         -> product_families.
ALTER TABLE "public"."products"
    DROP COLUMN "images",
    DROP COLUMN "colorImageMap",
    DROP COLUMN "availableColors",
    DROP COLUMN "inventory",
    DROP COLUMN "baseProductId",
    DROP COLUMN "variantType";

-- The label-keyed JSONB mirror of the same specifications.
ALTER TABLE "public"."product_translations" DROP COLUMN "specifications";

-- Entity-level slugs -> translation-level slugs (0002).
DROP INDEX "public"."categories_slug_idx";
DROP INDEX "public"."categories_categoryType_idx";
ALTER TABLE "public"."categories"
    DROP COLUMN "slug",
    DROP COLUMN "categoryType";

DROP INDEX "public"."sub_categories_slug_idx";
DROP INDEX "public"."sub_categories_categoryId_idx";
ALTER TABLE "public"."sub_categories" DROP COLUMN "slug";

-- Redundant with the UNIQUE constraints' own indexes on the same columns.
DROP INDEX "public"."products_productId_idx";
DROP INDEX "public"."products_slug_idx";

DROP TYPE "public"."available_colors";
DROP TYPE "public"."product_ip";
DROP TYPE "public"."category_type";
