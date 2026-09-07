-- 0006  Specifications become rows  (BUILD §7, amendments A2/A3/A4)
--
-- v1 stored specifications twice and agreed with itself nowhere:
--   * 15 typed columns on products (voltage, maxWattage, ... lifeTime), and
--   * ProductTranslation.specifications JSONB, keyed by DISPLAY LABEL, in each language.
-- Nothing could query a spec ("all IP65 fixtures over 3000 lm") without scanning JSONB,
-- and a spec renamed in Arabic silently became a different key.
--
-- v2: SpecDefinition is the vocabulary, ProductSpec is the value, SubCategorySpec says
-- which specs a sub-category is expected to carry.
--
-- unitEn / unitAr rather than one `unit` column (amendment A2): `hours` and `ساعة` cannot
-- share a column. Symbol units repeat across both, which is honest rather than clever.
--
-- The 15 definitions below are reference data, seeded here so the mapping is reviewable
-- as SQL rather than buried in a transform script. Sources, per amendment A4:
--   labelAr  <- the Arabic JSON keys in ProductTranslation.specifications, normalised
--   labelEn  <- the English JSON keys, with four wordings borrowed from the dead
--               apps/www/lib/product-specifications.ts map: IP Rating, Max IP Rating,
--               CRI, Brand of LED. Nothing else is resurrected from that file.
--   order    <- position in PREFERRED_SPEC_ORDER (apps/www/lib/product.ts), which is live
--               code, spaced by 10 so a spec can be inserted later without renumbering.
--               `lighting_type` is absent from that array and is placed FIRST, at 5: it is
--               a fixture-type descriptor and leads the sheet on the 10 products carrying it.
--
-- Deliberate corrections, each a defect rather than a preference:
--   ip_rating / max_ip_rating are TEXT, not NUMBER. The prefix is part of the value: the
--     row must read "IP20", not "IP Rating: 20". The transform coerces production's
--     numeric IP: 20 / maxIP: 44 on the way in and records every coercion in its report.
--   luminous_flux.labelAr is التدفق الضوئي, not اللومن. اللومن is the UNIT, which already
--     lives in unitAr as lm; using it as the label renders "اللومن: 3000 lm".
--   voltage is Input Voltage / جهد الدخل. Values are AC 220V — that is the operating
--     voltage and both languages should say so. The displayed Arabic changes from المدخل.
--   أقصى درجة حماية -> أقصى درجة الحماية, ابعاد المنتج -> أبعاد المنتج, المحرك ->
--     ترانس أو بطارية (a driver is a transformer, not a motor).
--   Stray markers stripped: the ° from زاوية الإضاءة° and the (w) from
--     أقصى قوة كهربائية (w) — both are units, and units now have their own columns.
--
-- Not specs, and deliberately absent: surface_color / الالوان المتوفره الي المنتج moves to
-- product_available_colors (0005), and color_Temperature / درجة حرارة لون الاضاءة stays on
-- products.colorTemperatures. Both are product STATE that the storefront filters and the
-- cart snapshots — they are not descriptive text.
--
-- سمك العود (8 track SKUs) merges into product_dimensions; the 8 SKUs are listed in the
-- transform report so the loss of the more specific Arabic label is visible, not silent.

CREATE TYPE "public"."spec_value_type" AS ENUM ('NUMBER', 'TEXT', 'BOOLEAN');

CREATE TABLE "public"."spec_definitions" (
    "key"       TEXT NOT NULL,
    "valueType" "public"."spec_value_type" NOT NULL,
    "unitEn"    TEXT,
    "unitAr"    TEXT,
    "labelEn"   TEXT NOT NULL,
    "labelAr"   TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "spec_definitions_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "spec_definitions_order_idx" ON "public"."spec_definitions"("order");

CREATE TABLE "public"."sub_category_specs" (
    "subCategoryId" TEXT NOT NULL,
    "specKey"       TEXT NOT NULL,
    "required"      BOOLEAN NOT NULL DEFAULT false,
    "order"         INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sub_category_specs_pkey" PRIMARY KEY ("subCategoryId", "specKey")
);

CREATE INDEX "sub_category_specs_specKey_idx" ON "public"."sub_category_specs"("specKey");

CREATE TABLE "public"."product_specs" (
    "id"          TEXT NOT NULL,
    "productId"   TEXT NOT NULL,
    "specKey"     TEXT NOT NULL,
    "valueNumber" DECIMAL(12,3),
    "valueEn"     TEXT,
    "valueAr"     TEXT,
    "valueBool"   BOOLEAN,

    CONSTRAINT "product_specs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_specs_productId_specKey_key" ON "public"."product_specs"("productId", "specKey");
-- The two composite indexes are the point of the whole model: they are what makes
-- "IP65 and over 3000 lm" an index scan instead of a JSONB table scan.
CREATE INDEX "product_specs_specKey_valueNumber_idx" ON "public"."product_specs"("specKey", "valueNumber");
CREATE INDEX "product_specs_specKey_valueEn_idx" ON "public"."product_specs"("specKey", "valueEn");

ALTER TABLE "public"."sub_category_specs"
    ADD CONSTRAINT "sub_category_specs_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "public"."sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."sub_category_specs"
    ADD CONSTRAINT "sub_category_specs_specKey_fkey"
    FOREIGN KEY ("specKey") REFERENCES "public"."spec_definitions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_specs"
    ADD CONSTRAINT "product_specs_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."product_specs"
    ADD CONSTRAINT "product_specs_specKey_fkey"
    FOREIGN KEY ("specKey") REFERENCES "public"."spec_definitions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "public"."spec_definitions" ("key", "valueType", "unitEn", "unitAr", "labelEn", "labelAr", "order") VALUES
    ('lighting_type',      'TEXT',   NULL,    NULL,    'Lighting Type',      'نوع الإضاءة',              5),
    ('voltage',            'TEXT',   NULL,    NULL,    'Input Voltage',      'جهد الدخل',               10),
    ('maximum_wattage',    'NUMBER', 'W',     'W',     'Maximum Wattage',    'أقصى قوة كهربائية',       20),
    ('brand_of_led',       'TEXT',   NULL,    NULL,    'Brand of LED',       'علامة الليد التجارية',    30),
    ('luminous_flux',      'NUMBER', 'lm',    'lm',    'Luminous Flux',      'التدفق الضوئي',           40),
    ('main_material',      'TEXT',   NULL,    NULL,    'Main Material',      'مادة التصنيع',            50),
    ('cri',                'TEXT',   NULL,    NULL,    'CRI',                'مؤشر تجسيد الألوان',      60),
    ('beam_angle',         'NUMBER', '°',     '°',     'Beam Angle',         'زاوية الإضاءة',           70),
    ('driver',             'TEXT',   NULL,    NULL,    'Driver',             'ترانس أو بطارية',         80),
    ('power_factor',       'TEXT',   NULL,    NULL,    'Power Factor',       'معامل القدرة',            90),
    ('ip_rating',          'TEXT',   NULL,    NULL,    'IP Rating',          'درجة الحماية',           100),
    ('max_ip_rating',      'TEXT',   NULL,    NULL,    'Max IP Rating',      'أقصى درجة الحماية',      110),
    ('life_time',          'NUMBER', 'hours', 'ساعة',  'Life Time',          'العمر الافتراضي',        120),
    ('product_dimensions', 'TEXT',   NULL,    NULL,    'Product Dimensions', 'أبعاد المنتج',           130),
    ('hole_size',          'TEXT',   NULL,    NULL,    'Hole Size',          'حجم الفتحة',             140);
