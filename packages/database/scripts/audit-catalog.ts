/**
 * Catalog data-quality audit — BUILD §10.3 / §19, as a repeatable script.
 *
 *   pnpm --filter @repo/database audit:catalog                 # the branch
 *   NODE_ENV=production pnpm --filter @repo/database audit:catalog   # production (read-only)
 *
 * Read-only, and every query goes through $queryRaw so it runs against a v1-shaped database
 * as well as a partially-migrated one. The point is not to produce prose: it ASSERTS the
 * facts the transform depends on and exits non-zero when one moves. A number that changed
 * between the audit and the transform is the failure mode this exists to catch.
 *
 * Nothing here repairs anything. Defects are carried across verbatim and queued for P5 (N4).
 */
import { PrismaClient } from "@prisma/client"
import { SPEC_MAP, EXCLUDED_KEYS, ROD_THICKNESS_SKUS } from "../spec-map"

const prisma = new PrismaClient()

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
    const ok = String(actual) === String(expected)
    if (!ok) failures++
    console.log(`${ok ? "  ok  " : "  FAIL"} ${label.padEnd(46)} ${String(actual).padStart(12)}  (expected ${expected})`)
}
function note(label: string, value: unknown) {
    console.log(`  ..   ${label.padEnd(46)} ${String(value).padStart(12)}`)
}
function section(title: string) {
    console.log(`\n── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`)
}

/**
 * Run a single-value query and return it as a string. Everything is compared as a string
 * because these come back as bigint, Decimal and text depending on the aggregate, and
 * "did this number change" should not depend on which.
 *
 * No caller interpolates anything: every query below is a literal. Parameterised lookups
 * use $queryRaw with real bindings instead.
 */
async function one(sql: TemplateStringsArray): Promise<string> {
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql.join(""))
    const value = rows[0] ? Object.values(rows[0])[0] : null
    return value === null || value === undefined ? "" : String(value)
}

/** How many translation rows in `locale` carry `key` in their specifications blob. */
async function keyCount(locale: string, key: string): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM product_translations
         WHERE locale = ${locale} AND jsonb_exists(specifications, ${key})`
    return Number(rows[0]?.n ?? 0)
}

async function main() {
    // This audit reads v1 columns, so it only means anything BEFORE 0011 has run.
    const v1 = await one`select count(*) from information_schema.columns
                          where table_schema='public' and table_name='products' and column_name='images'`
    if (v1 === "0") {
        console.error("[audit] this database is already pure v2: products.images is gone, so there is nothing")
        console.error("[audit] left to audit here. Run it against production (NODE_ENV=production) or against a")
        console.error("[audit] branch that has not yet had 0011_drop_v1_catalog_columns applied.")
        await prisma.$disconnect()
        process.exit(2)
    }

    section("Baseline row counts (§1.1)")
    check("products", await one`select count(*) from products`, 189)
    check("product_translations", await one`select count(*) from product_translations`, 378)
    check("categories", await one`select count(*) from categories`, 2)
    check("category_translations", await one`select count(*) from category_translations`, 4)
    check("sub_categories", await one`select count(*) from sub_categories`, 25)
    check("sub_category_translations", await one`select count(*) from sub_category_translations`, 50)
    check("users", await one`select count(*) from users`, 1)
    check("orders", await one`select count(*) from orders`, 4)
    check("order_items", await one`select count(*) from order_items`, 0)
    check("carts", await one`select count(*) from carts`, 0)
    check("contact_forms", await one`select count(*) from contact_forms`, 0)

    section("Price invariant (§18.3) — the destination must match to the cent")
    check("sum(price)", await one`select to_char(sum(price), 'FM999999990.00') from products`, "232454.00")
    check("prices with more than 2 decimals", await one`select count(*) from products where round(price::numeric, 2) <> price::numeric`, 0)
    check("prices <= 0", await one`select count(*) from products where price <= 0`, 0)
    note("min / max", `${await one`select min(price)::text from products`} / ${await one`select max(price)::text from products`}`)

    section("Empty specifications (§19) — 14, not the spec's 13")
    const emptyEn = await one`select count(*) from product_translations where locale='en' and specifications::text = '{}'`
    const emptyAr = await one`select count(*) from product_translations where locale='ar' and specifications::text = '{}'`
    check("empty in en", emptyEn, 14)
    check("empty in ar", emptyAr, 14)
    check("empty in exactly one locale", await one`
        select count(*) from (
          select "productId" from product_translations where specifications::text = '{}' group by 1 having count(*) = 1
        ) t`, 0)
    const emptySkus = await prisma.$queryRaw<Array<{ productId: string }>>`
        select p."productId" from products p
         where exists (select 1 from product_translations t where t."productId"=p.id and t.specifications::text='{}')
         order by 1`
    console.log(`       ${emptySkus.map((r) => r.productId).join(", ")}`)

    section("Specification key inventory (§2.3) — SPEC_MAP against reality")
    for (const mapping of SPEC_MAP) {
        const en = await keyCount("en", mapping.en)
        const arTotal = (await Promise.all(mapping.ar.map((key) => keyCount("ar", key)))).reduce((a, b) => a + b, 0)
        check(`${mapping.key} (en)`, en, mapping.expectedCount)
        check(`${mapping.key} (ar, ${mapping.ar.length} source key${mapping.ar.length > 1 ? "s" : ""})`, arTotal, mapping.expectedCount)
    }
    const knownEn = new Set([...SPEC_MAP.map((m) => m.en), ...Object.keys(EXCLUDED_KEYS)])
    const knownAr = new Set([...SPEC_MAP.flatMap((m) => m.ar), ...Object.keys(EXCLUDED_KEYS)])
    const allKeys = await prisma.$queryRaw<Array<{ locale: string; key: string }>>`
        select locale, k as key from product_translations, lateral jsonb_object_keys(specifications) k
         where specifications is not null group by 1, 2`
    const unmapped = allKeys.filter((r) => !(r.locale === "en" ? knownEn : knownAr).has(r.key))
    check("production keys with no SPEC_MAP entry", unmapped.length, 0)
    for (const r of unmapped) console.log(`       UNMAPPED ${r.locale}: ${JSON.stringify(r.key)}`)
    note("keys deliberately excluded", Object.keys(EXCLUDED_KEYS).length)
    note("rod-thickness SKUs merged into product_dimensions", ROD_THICKNESS_SKUS.length)

    section("Spec defects (N4) — reported, never repaired")
    const booleans = await prisma.$queryRaw<Array<{ productId: string; locale: string; key: string }>>`
        select p."productId", t.locale, k as key
          from product_translations t join products p on p.id = t."productId", lateral jsonb_object_keys(t.specifications) k
         where jsonb_typeof(t.specifications -> k) = 'boolean' order by 1, 2, 3`
    note("boolean values where text/number expected", booleans.length)
    for (const b of booleans) console.log(`       ${b.productId}  ${b.locale}  ${b.key}`)
    note(`values that are "-" (main_material, en)`, await one`select count(*) from product_translations where locale='en' and specifications->>'main_material' = '-'`)
    note(`values that are "-" (hole_size, en)`, await one`select count(*) from product_translations where locale='en' and specifications->>'hole_size' = '-'`)
    note(`values that are "-" (luminous_flux, en)`, await one`select count(*) from product_translations where locale='en' and specifications->>'luminous_flux' = '-'`)
    note("main_material values with surrounding whitespace", await one`
        select count(*) from product_translations
         where specifications->>'main_material' <> btrim(specifications->>'main_material')`)

    section("Translations (§14.3 activation rule)")
    check("products with a translation in both locales", await one`
        select count(*) from (select "productId" from product_translations group by 1 having count(distinct locale)=2) t`, 189)
    check("empty product names", await one`select count(*) from product_translations where btrim(name) = ''`, 0)
    check("locales present", await one`select count(distinct locale) from product_translations`, 2)
    note("empty metaTitle (activation must NOT require it)", await one`select count(*) from product_translations where coalesce(btrim("metaTitle"),'') = ''`)
    note("empty metaDescription", await one`select count(*) from product_translations where coalesce(btrim("metaDescription"),'') = ''`)

    section("Families (§1.5) — grouping comes from baseProductId, never a regex")
    check("distinct baseProductId", await one`select count(distinct "baseProductId") from products`, 89)
    check("products with null baseProductId", await one`select count(*) from products where "baseProductId" is null`, 0)
    check("families spanning >1 sub-category", await one`
        select count(*) from (select "baseProductId" from products group by 1 having count(distinct "subCategoryId")>1) t`, 0)
    check("families with inconsistent variantType", await one`
        select count(*) from (select "baseProductId" from products group by 1 having count(distinct coalesce("variantType",'~'))>1) t`, 0)
    const sizes = await prisma.$queryRaw<Array<{ members: number }>>`
        select count(*)::int as members from products group by "baseProductId"`
    const dist = new Map<number, number>()
    for (const row of sizes) dist.set(row.members, (dist.get(row.members) ?? 0) + 1)
    note("size distribution", [...dist].sort((a, b) => a[0] - b[0]).map(([m, f]) => `${m}→${f}`).join("  "))

    section("Product state (N1, N2)")
    check("isActive = true", await one`select count(*) from products where "isActive"`, 189)
    note("isFeatured = true  (N2: every featured surface is empty)", await one`select count(*) from products where "isFeatured"`)
    note("distinct inventory values (N1: 5000 is a placeholder)", await one`select count(distinct inventory) from products`)
    note("total units", await one`select sum(inventory)::text from products`)

    section("Slugs (§9.3)")
    check("product slug collisions", await one`select count(*) from (select slug from products group by 1 having count(*)>1) t`, 0)
    const divergent = await prisma.$queryRaw<Array<{ productId: string; slug: string }>>`
        select "productId", slug from products where slug <> "productId" order by 1`
    note("slug differs from productId (needs ProductSlugHistory)", divergent.length)
    for (const d of divergent) console.log(`       ${d.productId.padEnd(20)} -> ${d.slug}`)

    section("Configurations (A17)")
    check("resolving against products.id", await one`select count(*) from configurations c join products p on p.id = c."productId"`, 0)
    check("resolving against products.productId (the SKU)", await one`select count(*) from configurations c join products p on p."productId" = c."productId"`, 13)

    await prisma.$disconnect()
    console.log(`\n${failures === 0 ? "[audit] OK: every asserted fact holds." : `[audit] FAIL: ${failures} assertion(s) moved. The transform must not run until they are explained.`}`)
    process.exit(failures === 0 ? 0 : 1)
}

main()
