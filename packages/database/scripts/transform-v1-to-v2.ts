import { Prisma, PrismaClient } from "@prisma/client"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { BY_AR_KEY, BY_EN_KEY, coerceSpecValue, ROD_THICKNESS_SKUS, SPEC_MAP } from "../spec-map"
import { DEFAULT_LOCATION_ID, MIGRATED_OPENING_REASON, OPENING_COUNT_PENDING_KEY, recordMovement } from "../inventory"
import { collectReferences, loadOverrides, loadTrees, PACKAGE_ROOT, resolve } from "../media"
import { requireSlug } from "../slug"
import { LOCALES, type Locale } from "../locale"

const prisma = new PrismaClient()
const allowLocalMedia = process.argv.includes("--allow-local-media")

const warnings: string[] = []
const coercions: string[] = []
function warn(message: string) {
    warnings.push(message)
}

interface ManifestEntry {
    publicId: string
    url: string | null
    width: number | null
    height: number | null
    blurDataUrl: string | null
}

function loadManifest(): { provider: string; entries: Record<string, ManifestEntry> } {
    const file = join(PACKAGE_ROOT, "data", "media-manifest.json")
    if (!existsSync(file)) {
        throw new Error("no media manifest. Run `pnpm media:scan` (and `media:upload`) first.")
    }
    const manifest = JSON.parse(readFileSync(file, "utf8"))
    if (manifest.provider !== "cloudinary" && !allowLocalMedia) {
        throw new Error(
            'the media manifest has provider "local": no image has been uploaded yet, so every ProductImage.url\n' +
                "would be a local path. Run `pnpm media:upload` with the Cloudinary credentials, or pass\n" +
                "--allow-local-media to transform anyway (useful for verifying the rest of the transform, and\n" +
                "clearly reported)."
        )
    }
    return manifest
}

function id(prefix: string, ...parts: string[]): string {
    return `${prefix}_${parts.join("_")}`.replace(/[^A-Za-z0-9_*.-]/g, "-").slice(0, 190)
}

interface V1Product {
    id: string
    productId: string
    slug: string
    subCategoryId: string
    baseProductId: string
    variantType: string | null
    inventory: number
    images: string[] | null
    colorImageMap: Record<string, string[]> | null
    availableColors: string[] | null
}

async function main() {
    const manifest = loadManifest()
    if (manifest.provider === "local") {
        warn("MEDIA: the manifest is LOCAL — every ProductImage.url is a repo path, not a Cloudinary URL. Re-run after `media:upload`.")
    }

    const pending = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images'`
    if (Number(pending[0]!.n) === 0) {
        throw new Error("products.images is gone: 0011 has already run, so there is nothing left to transform.")
    }

    const products = await prisma.$queryRaw<V1Product[]>`
        SELECT id, "productId", slug, "subCategoryId", "baseProductId", "variantType",
               inventory, images, "colorImageMap", "availableColors"::text[] AS "availableColors"
          FROM products ORDER BY "productId"`
    console.log(`[transform] ${products.length} products in scope\n`)

    await taxonomySlugs()
    const familyByBase = await families(products)
    await productFamilies(products, familyByBase)
    await specs(products)
    await subCategorySpecs()
    await images(products, manifest)
    await colors(products)
    await inventory(products)
    await slugHistory(products)
    await reconcile(products)
}

async function taxonomySlugs() {
    const rows = await prisma.$queryRaw<
        Array<{ table: string; id: string; locale: string; name: string; entitySlug: string }>
    >`
        SELECT 'category_translations' AS "table", t.id, t.locale, t.name, c.slug AS "entitySlug"
          FROM category_translations t JOIN categories c ON c.id = t."categoryId"
        UNION ALL
        SELECT 'sub_category_translations', t.id, t.locale, t.name, s.slug
          FROM sub_category_translations t JOIN sub_categories s ON s.id = t."subCategoryId"`

    const taken = new Map<string, string>()
    let written = 0
    for (const row of rows) {
        const locale = row.locale as Locale
        const slug = locale === "en" ? row.entitySlug : requireSlug(row.name, `${row.table} ${row.id}`)
        const key = `${locale}/${slug}`
        const owner = taken.get(key)
        if (owner) throw new Error(`duplicate taxonomy slug ${key}: ${owner} and ${row.name}`)
        taken.set(key, row.name)

        if (row.name !== row.name.trim()) {
            coercions.push(`SLUG: ${JSON.stringify(row.name)} trimmed for slug generation; display name untouched (A9)`)
        }
        await prisma.$executeRawUnsafe(`UPDATE "${row.table}" SET slug = $1 WHERE id = $2`, slug, row.id)
        written++
    }
    console.log(`[1/9] taxonomy slugs      ${String(written).padStart(4)} written, 0 collisions`)
}

async function families(products: V1Product[]) {
    const groups = new Map<string, V1Product[]>()
    for (const product of products) {
        groups.set(product.baseProductId, [...(groups.get(product.baseProductId) ?? []), product])
    }

    const familyByBase = new Map<string, string>()
    const writes: Prisma.PrismaPromise<unknown>[] = []
    for (const [base, members] of groups) {
        const variantTypes = new Set(members.map((m) => m.variantType ?? null))
        if (variantTypes.size > 1) {
            throw new Error(`family ${base} has inconsistent variantType: ${[...variantTypes].join(", ")}`)
        }
        const subCategories = new Set(members.map((m) => m.subCategoryId))
        if (subCategories.size > 1) throw new Error(`family ${base} spans ${subCategories.size} sub-categories`)

        const familyId = id("fam", base)
        familyByBase.set(base, familyId)
        const slug = requireSlug(base, `family ${base}`)

        writes.push(
            prisma.productFamily.upsert({
                where: { id: familyId },
                create: {
                    id: familyId,
                    subCategoryId: members[0]!.subCategoryId,
                    slug,
                    variantType: members[0]!.variantType,
                    order: 0,
                },
                update: { subCategoryId: members[0]!.subCategoryId, slug, variantType: members[0]!.variantType },
            })
        )

        for (const locale of LOCALES) {
            writes.push(
                prisma.productFamilyTranslation.upsert({
                    where: { familyId_locale: { familyId, locale } },
                    create: { id: id("famt", base, locale), familyId, locale, slug, name: base },
                    update: { slug, name: base },
                })
            )
        }
    }
    await flush(writes)
    warn(`FAMILIES: all 89 family names are the SKU stem. Every ProductTranslation.name in both locales is the product's own SKU — the catalog has no human-readable names in either language. P5 data-quality queue.`)
    console.log(`[2/9] families            ${String(groups.size).padStart(4)} families, ${groups.size * 2} translations`)
    return familyByBase
}

async function productFamilies(products: V1Product[], familyByBase: Map<string, string>) {
    await flush(
        products.map((product) =>
            prisma.product.update({
                where: { id: product.id },
                data: { familyId: familyByBase.get(product.baseProductId)! },
            })
        )
    )
    console.log(`[3/9] product.familyId    ${String(products.length).padStart(4)} set`)
}

const BATCH = 500

async function flush(operations: Prisma.PrismaPromise<unknown>[]): Promise<void> {
    for (let i = 0; i < operations.length; i += BATCH) {
        await prisma.$transaction(operations.slice(i, i + BATCH))
    }
}

async function specs(products: V1Product[]) {
    const translations = await prisma.$queryRaw<Array<{ productId: string; locale: string; specifications: unknown }>>`
        SELECT "productId", locale, specifications FROM product_translations`

    const byProduct = new Map<string, { en: Record<string, unknown>; ar: Record<string, unknown> }>()
    for (const row of translations) {
        const bucket = byProduct.get(row.productId) ?? { en: {}, ar: {} }
        bucket[row.locale as Locale] = (row.specifications as Record<string, unknown>) ?? {}
        byProduct.set(row.productId, bucket)
    }

    let written = 0
    const writes: Prisma.PrismaPromise<unknown>[] = []
    let emptyProducts = 0
    for (const product of products) {
        const blobs = byProduct.get(product.id) ?? { en: {}, ar: {} }
        if (!Object.keys(blobs.en).length && !Object.keys(blobs.ar).length) {
            emptyProducts++
            continue
        }

        for (const mapping of SPEC_MAP) {
            const rawEn = blobs.en[mapping.en]
            const arKey = mapping.ar.find((key) => key in blobs.ar)
            const rawAr = arKey ? blobs.ar[arKey] : undefined
            if (rawEn === undefined && rawAr === undefined) continue

            const value = coerceSpecValue(mapping, rawEn, rawAr)
            if (value.coercion) coercions.push(`SPEC ${product.productId}.${mapping.key}: ${value.coercion}`)
            if (value.defect) warn(`SPEC ${product.productId}.${mapping.key}: ${value.defect} — carried across verbatim (N4)`)
            if (arKey === "سمك العود") {
                coercions.push(`SPEC ${product.productId}: Arabic key سمك العود merged into product_dimensions`)
            }

            writes.push(
                prisma.productSpec.upsert({
                where: { productId_specKey: { productId: product.id, specKey: mapping.key } },
                create: {
                    id: id("ps", product.productId, mapping.key),
                    productId: product.id,
                    specKey: mapping.key,
                    valueEn: value.valueEn,
                    valueAr: value.valueAr,
                    valueNumber: value.valueNumber,
                    valueBool: value.valueBool,
                },
                    update: {
                        valueEn: value.valueEn,
                        valueAr: value.valueAr,
                        valueNumber: value.valueNumber,
                        valueBool: value.valueBool,
                    },
                })
            )
            written++
        }

        for (const key of Object.keys(blobs.en)) {
            if (!BY_EN_KEY.has(key) && !["surface_color", "color_Temperature"].includes(key)) {
                throw new Error(`unmapped English spec key ${JSON.stringify(key)} on ${product.productId}`)
            }
        }
        for (const key of Object.keys(blobs.ar)) {
            if (!BY_AR_KEY.has(key) && !["الالوان المتوفره الي المنتج", "درجة حرارة لون الاضاءة"].includes(key)) {
                throw new Error(`unmapped Arabic spec key ${JSON.stringify(key)} on ${product.productId}`)
            }
        }
    }
    warn(`SPECS: ${ROD_THICKNESS_SKUS.length} track SKUs lose the more specific Arabic label سمك العود to product_dimensions: ${ROD_THICKNESS_SKUS.join(", ")}`)
    await flush(writes)
    console.log(`[4/9] product specs       ${String(written).padStart(4)} rows; ${emptyProducts} products have no specification data at all`)
}

async function subCategorySpecs() {
    const rows = await prisma.$queryRaw<Array<{ subCategoryId: string; specKey: string; withSpec: bigint; total: bigint }>>`
        SELECT p."subCategoryId", s."specKey",
               count(*) AS "withSpec",
               (SELECT count(*) FROM products q WHERE q."subCategoryId" = p."subCategoryId") AS total
          FROM product_specs s JOIN products p ON p.id = s."productId"
         GROUP BY p."subCategoryId", s."specKey"`

    const order = new Map(SPEC_MAP.map((m, i) => [m.key, i]))
    for (const row of rows) {
        await prisma.subCategorySpec.upsert({
            where: { subCategoryId_specKey: { subCategoryId: row.subCategoryId, specKey: row.specKey } },
            create: {
                subCategoryId: row.subCategoryId,
                specKey: row.specKey,
                required: row.withSpec === row.total,
                order: order.get(row.specKey) ?? 0,
            },
            update: { required: row.withSpec === row.total, order: order.get(row.specKey) ?? 0 },
        })
    }
    const required = rows.filter((r) => r.withSpec === r.total).length
    console.log(`[5/9] sub-category specs  ${String(rows.length).padStart(4)} rows (${required} required)`)
}

async function images(products: V1Product[], manifest: { entries: Record<string, ManifestEntry> }) {
    const trees = loadTrees()
    const overrides = loadOverrides()
    const resolutions = resolve(await collectReferences(prisma), trees, overrides)
    const usedOverrides = new Set(resolutions.filter((r) => r.via === "override").map((r) => r.path))
    const fromAdmin = new Set(resolutions.filter((r) => r.source === "admin" && r.via === "exact").map((r) => r.path))

    const colorIdByKey = new Map((await prisma.productColor.findMany()).map((c) => [c.key, c.id]))
    let written = 0
    const writes: Prisma.PrismaPromise<unknown>[] = []

    for (const product of products) {
        const claims = new Map<string, string>()
        for (const [colorKey, paths] of Object.entries(product.colorImageMap ?? {})) {
            for (const path of paths) claims.set(path, colorKey)
        }

        const paths = product.images ?? []
        if (!paths.length) warn(`IMAGES: ${product.productId} has no images at all`)

        for (const [index, path] of paths.entries()) {
            const entry = manifest.entries[path]
            if (!entry) throw new Error(`no manifest entry for ${path} (${product.productId})`)
            if (usedOverrides.has(path)) coercions.push(`MEDIA ${product.productId}: override applied for ${path}`)
            if (fromAdmin.has(path)) coercions.push(`MEDIA ${product.productId}: resolved from the admin tree — ${path}`)

            const colorKey = claims.get(path)
            writes.push(
            prisma.productImage.upsert({
                where: { id: id("img", product.productId, String(index)) },
                create: {
                    id: id("img", product.productId, String(index)),
                    productId: product.id,
                    url: entry.url ?? path,
                    publicId: entry.publicId,
                    order: index,
                    colorId: colorKey ? (colorIdByKey.get(colorKey) ?? null) : null,
                    width: entry.width,
                    height: entry.height,
                    blurDataUrl: entry.blurDataUrl,
                },
                update: {
                    url: entry.url ?? path,
                    publicId: entry.publicId,
                    order: index,
                    colorId: colorKey ? (colorIdByKey.get(colorKey) ?? null) : null,
                    width: entry.width,
                    height: entry.height,
                    blurDataUrl: entry.blurDataUrl,
                },
            })
        )
            written++
        }
    }
    await flush(writes)
    console.log(`[6/9] product images      ${String(written).padStart(4)} rows (${usedOverrides.size} via override, ${fromAdmin.size} from the admin tree)`)
}

async function colors(products: V1Product[]) {
    const colorIdByKey = new Map((await prisma.productColor.findMany()).map((c) => [c.key, c.id]))
    let written = 0
    const writes: Prisma.PrismaPromise<unknown>[] = []
    let none = 0
    for (const product of products) {
        const keys = product.availableColors ?? []
        if (!keys.length) none++
        for (const [index, key] of keys.entries()) {
            const colorId = colorIdByKey.get(key)
            if (!colorId) throw new Error(`unknown colour key ${key} on ${product.productId}`)
            writes.push(
            prisma.productAvailableColor.upsert({
                where: { productId_colorId: { productId: product.id, colorId } },
                create: { productId: product.id, colorId, order: index },
                update: { order: index },
            })
        )
            written++
        }
    }
    warn(`COLOURS: ${none} products have no available colours. WOOD exists in the lookup and is used by none.`)
    await flush(writes)
    console.log(`[7/9] available colours   ${String(written).padStart(4)} rows; ${none} products with none`)
}

async function inventory(products: V1Product[]) {
    let written = 0
    await prisma.$transaction(async (tx) => {
    for (const product of products) {
        const result = await recordMovement(tx, {
                productId: product.id,
                locationId: DEFAULT_LOCATION_ID,
                type: "INITIAL",
                quantity: product.inventory,
                unitCost: null,
                reason: MIGRATED_OPENING_REASON,
                referenceType: "migration",
                referenceId: "transform-v1-to-v2",
                actorType: "SYSTEM",
            })
            if (!result.deduplicated) written++
        }
    })

    await prisma.systemSetting.upsert({
        where: { key: OPENING_COUNT_PENDING_KEY },
        create: { id: id("setting", OPENING_COUNT_PENDING_KEY), key: OPENING_COUNT_PENDING_KEY, value: "true" },
        update: { value: "true" },
    })
    warn(`INVENTORY: all 189 opening balances are the seeded placeholder 5000, not a physical count. unitCost is null, ${OPENING_COUNT_PENDING_KEY} is set, and valuation must read "opening count pending" until the first stocktake (N1, a P5 deliverable).`)
    console.log(`[8/9] inventory           ${String(written).padStart(4)} INITIAL movements; ${OPENING_COUNT_PENDING_KEY}=true`)
}

async function slugHistory(products: V1Product[]) {
    let written = 0
    const writes: Prisma.PrismaPromise<unknown>[] = []
    for (const product of products) {
        if (product.slug === product.productId) continue
        writes.push(
            prisma.productSlugHistory.upsert({
                where: { slug: product.productId },
                create: { id: id("psh", product.productId), productId: product.id, slug: product.productId },
                update: { productId: product.id },
            })
        )
        written++
    }
    await flush(writes)
    console.log(`[9/9] slug history        ${String(written).padStart(4)} rows for SKU -> slug divergences`)
}

async function reconcile(products: V1Product[]) {
    console.log(`\n${"═".repeat(72)}\nRECONCILIATION\n${"═".repeat(72)}`)

    const counts = await prisma.$transaction([
        prisma.product.count(),
        prisma.productTranslation.count(),
        prisma.productFamily.count(),
        prisma.productFamilyTranslation.count(),
        prisma.productSpec.count(),
        prisma.subCategorySpec.count(),
        prisma.productImage.count(),
        prisma.productAvailableColor.count(),
        prisma.stockMovement.count(),
        prisma.stockLevel.count(),
        prisma.productSlugHistory.count(),
        prisma.productConfiguration.count(),
        prisma.order.count(),
    ])
    const labels = [
        "products", "product_translations", "product_families", "product_family_translations",
        "product_specs", "sub_category_specs", "product_images", "product_available_colors",
        "stock_movements", "stock_levels", "product_slug_history", "product_configurations", "orders",
    ]
    for (const [i, label] of labels.entries()) console.log(`  ${label.padEnd(30)} ${String(counts[i]).padStart(6)}`)

    const sum = await prisma.product.aggregate({ _sum: { price: true } })
    const total = (sum._sum.price ?? new Prisma.Decimal(0)).toFixed(2)
    const nullSlugs = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT (SELECT count(*) FROM category_translations WHERE slug IS NULL)
             + (SELECT count(*) FROM sub_category_translations WHERE slug IS NULL) AS n`
    const drift = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM (
          SELECT l."productId" FROM stock_levels l
            JOIN (SELECT "productId", sum(quantity) AS q FROM stock_movements GROUP BY 1) m
              ON m."productId" = l."productId"
           WHERE m.q <> l."onHand") t`

    const checks: Array<[string, unknown, unknown]> = [
        ["product count", counts[0], products.length],
        ["sum(price) to the cent", total, "232454.00"],
        ["product translations", counts[1], 378],
        ["families", counts[2], 89],
        ["taxonomy slugs still null", Number(nullSlugs[0]!.n), 0],
        ["ledger vs stock_levels drift", Number(drift[0]!.n), 0],
        ["INITIAL movements", counts[8], products.length],
    ]

    console.log("")
    let failed = 0
    for (const [label, actual, expected] of checks) {
        const ok = String(actual) === String(expected)
        if (!ok) failed++
        console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(32)} ${String(actual).padStart(12)}  (expected ${expected})`)
    }

    if (coercions.length) {
        console.log(`\n── Coercions and resolutions applied (${coercions.length}) ${"─".repeat(20)}`)
        const grouped = new Map<string, number>()
        for (const c of coercions) {
            const kind = c.split(" ")[0]!.replace(":", "")
            grouped.set(kind, (grouped.get(kind) ?? 0) + 1)
        }
        for (const [kind, count] of grouped) console.log(`  ${String(count).padStart(4)} × ${kind}`)
        console.log("")
        for (const c of coercions.filter((c) => c.includes("->") || c.includes("merged") || c.includes("trimmed"))) {
            console.log(`       ${c}`)
        }
    }
    if (warnings.length) {
        console.log(`\n── Warnings — reported, never repaired (${warnings.length}) ${"─".repeat(16)}`)
        for (const w of warnings) console.log(`  • ${w}`)
    }

    await prisma.$disconnect()
    if (failed) {
        console.error(`\n[transform] FAILED: ${failed} invariant(s) did not hold. The transform did not succeed regardless of what else ran.`)
        process.exit(1)
    }
    console.log(`\n[transform] OK: every §18.3 invariant holds.`)
    console.log(`[transform] Next: pnpm db:migrate:to 0011_drop_v1_catalog_columns`)
}

main().catch(async (error) => {
    console.error(`\n[transform] STOPPED: ${error instanceof Error ? error.message : String(error)}`)
    await prisma.$disconnect()
    process.exit(1)
})
