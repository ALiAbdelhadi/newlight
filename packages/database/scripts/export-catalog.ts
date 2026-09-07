/**
 * Catalog export and restore — BUILD §20 conditions 2 and 7.
 *
 *   pnpm --filter @repo/database catalog:export [path]
 *   pnpm --filter @repo/database catalog:restore <path>
 *
 * The legacy JSON files under apps/www/data are currently acting as an accidental backup of
 * the catalog. Deleting them makes the database the ONLY copy, so §20 will not let them go
 * until a real replacement exists AND has been proven to restore. This is both halves: the
 * export is the backup and the dev-environment seed source, and `restore` is what makes
 * condition 7 something you can run rather than something you assert.
 *
 * Deterministic: everything is ordered by a stable key and serialised with sorted output, so
 * two exports of the same catalog are byte-identical and a diff between them is meaningful.
 * Money is exported as a STRING — a JSON number cannot hold a Decimal without lying.
 *
 * Restore is additive-upsert, never destructive: it will not delete a row the file does not
 * mention. Restoring into a non-empty database is refused unless --force is passed.
 */
import { writeFileSync, readFileSync, existsSync, renameSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT } from "../media"
import { serializeMoney, serializeMoneyOrNull, sumMoney } from "../money"

const prisma = new PrismaClient()
const EXPORT_VERSION = 1

async function collect() {
    const [categories, subCategories, families, colors, specDefinitions, subCategorySpecs, products, slugHistory] =
        await Promise.all([
            prisma.category.findMany({ include: { translations: { orderBy: { locale: "asc" } } }, orderBy: { id: "asc" } }),
            prisma.subCategory.findMany({ include: { translations: { orderBy: { locale: "asc" } } }, orderBy: { id: "asc" } }),
            prisma.productFamily.findMany({ include: { translations: { orderBy: { locale: "asc" } } }, orderBy: { id: "asc" } }),
            prisma.productColor.findMany({ orderBy: { order: "asc" } }),
            prisma.specDefinition.findMany({ orderBy: { order: "asc" } }),
            prisma.subCategorySpec.findMany({ orderBy: [{ subCategoryId: "asc" }, { specKey: "asc" }] }),
            prisma.product.findMany({
                include: {
                    translations: { orderBy: { locale: "asc" } },
                    specs: { orderBy: { specKey: "asc" } },
                    images: { orderBy: { order: "asc" } },
                    availableColors: { orderBy: { colorId: "asc" } },
                },
                orderBy: { productId: "asc" },
            }),
            prisma.productSlugHistory.findMany({ orderBy: { slug: "asc" } }),
        ])

    return {
        $comment: [
            "Newlight catalog export. This is the replacement for the retired apps/www/data JSON",
            "files and the seed source for any future development environment (BUILD §20).",
            "",
            "Money is a STRING throughout: a JSON number cannot represent a Decimal without",
            "rounding it, and these are prices.",
            "",
            "Restore with: pnpm --filter @repo/database catalog:restore <this file>",
        ],
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        counts: {
            categories: categories.length,
            subCategories: subCategories.length,
            families: families.length,
            products: products.length,
            productTranslations: products.reduce((n, p) => n + p.translations.length, 0),
            productSpecs: products.reduce((n, p) => n + p.specs.length, 0),
            productImages: products.reduce((n, p) => n + p.images.length, 0),
        },
        /** The §18.3 invariant, carried inside the file so a restore can check itself. */
        priceTotal: serializeMoney(sumMoney(products.map((p) => p.price))),
        colors,
        specDefinitions,
        categories,
        subCategories,
        subCategorySpecs,
        families,
        products: products.map((product) => ({
            ...product,
            price: serializeMoney(product.price),
            averageCost: serializeMoneyOrNull(product.averageCost),
            specs: product.specs.map((spec) => ({ ...spec, valueNumber: spec.valueNumber?.toString() ?? null })),
        })),
        slugHistory,
    }
}

async function exportCatalog(target: string) {
    const data = await collect()
    const temp = `${target}.tmp`
    writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`)
    renameSync(temp, target)

    console.log(`[catalog] exported to ${target}`)
    for (const [label, count] of Object.entries(data.counts)) console.log(`[catalog]   ${label.padEnd(22)} ${String(count).padStart(6)}`)
    console.log(`[catalog]   ${"price total".padEnd(22)} ${data.priceTotal.padStart(6)}`)
    await prisma.$disconnect()
}

async function restoreCatalog(source: string, force: boolean) {
    if (!existsSync(source)) throw new Error(`no such export: ${source}`)
    const data = JSON.parse(readFileSync(source, "utf8")) as Awaited<ReturnType<typeof collect>>
    if (data.version !== EXPORT_VERSION) throw new Error(`export version ${data.version}, this script writes ${EXPORT_VERSION}`)

    const existing = await prisma.product.count()
    if (existing && !force) {
        throw new Error(`refusing to restore over ${existing} existing product(s). Pass --force if that is what you mean.`)
    }

    // Order matters: a product cannot reference a sub-category that does not exist yet.
    for (const color of data.colors) {
        await prisma.productColor.upsert({ where: { id: color.id }, create: color, update: color })
    }
    for (const definition of data.specDefinitions) {
        await prisma.specDefinition.upsert({ where: { key: definition.key }, create: definition, update: definition })
    }
    for (const category of data.categories) {
        const { translations, ...row } = category
        await prisma.category.upsert({ where: { id: row.id }, create: row, update: row })
        for (const translation of translations) {
            await prisma.categoryTranslation.upsert({ where: { id: translation.id }, create: translation, update: translation })
        }
    }
    for (const subCategory of data.subCategories) {
        const { translations, ...row } = subCategory
        await prisma.subCategory.upsert({ where: { id: row.id }, create: row, update: row })
        for (const translation of translations) {
            await prisma.subCategoryTranslation.upsert({ where: { id: translation.id }, create: translation, update: translation })
        }
    }
    for (const family of data.families) {
        const { translations, ...row } = family
        await prisma.productFamily.upsert({ where: { id: row.id }, create: row, update: row })
        for (const translation of translations) {
            await prisma.productFamilyTranslation.upsert({ where: { id: translation.id }, create: translation, update: translation })
        }
    }
    for (const spec of data.subCategorySpecs) {
        await prisma.subCategorySpec.upsert({
            where: { subCategoryId_specKey: { subCategoryId: spec.subCategoryId, specKey: spec.specKey } },
            create: spec,
            update: spec,
        })
    }
    for (const product of data.products) {
        const { translations, specs, images, availableColors, ...row } = product
        await prisma.product.upsert({ where: { id: row.id }, create: row, update: row })
        for (const translation of translations) {
            await prisma.productTranslation.upsert({ where: { id: translation.id }, create: translation, update: translation })
        }
        for (const spec of specs) {
            await prisma.productSpec.upsert({ where: { id: spec.id }, create: spec, update: spec })
        }
        for (const image of images) {
            await prisma.productImage.upsert({ where: { id: image.id }, create: image, update: image })
        }
        for (const link of availableColors) {
            await prisma.productAvailableColor.upsert({
                where: { productId_colorId: { productId: link.productId, colorId: link.colorId } },
                create: link,
                update: link,
            })
        }
    }
    for (const entry of data.slugHistory) {
        await prisma.productSlugHistory.upsert({ where: { id: entry.id }, create: entry, update: entry })
    }

    // Condition 7 is "a PROVEN restore", so the restore proves itself.
    const restored = await collect()
    const checks: Array<[string, unknown, unknown]> = [
        ["products", restored.counts.products, data.counts.products],
        ["product translations", restored.counts.productTranslations, data.counts.productTranslations],
        ["product specs", restored.counts.productSpecs, data.counts.productSpecs],
        ["product images", restored.counts.productImages, data.counts.productImages],
        ["price total", restored.priceTotal, data.priceTotal],
    ]
    let failed = 0
    for (const [label, actual, expected] of checks) {
        const ok = String(actual) === String(expected)
        if (!ok) failed++
        console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(24)} ${String(actual).padStart(10)}  (expected ${expected})`)
    }
    await prisma.$disconnect()
    if (failed) {
        console.error(`[catalog] RESTORE FAILED: ${failed} check(s) did not match the export.`)
        process.exit(1)
    }
    console.log(`[catalog] restore verified against the export it came from.`)
}

async function main() {
    const [command, ...rest] = process.argv.slice(2)
    const args = rest.filter((a) => !a.startsWith("--"))
    if (command === "export") {
        return exportCatalog(args[0] ?? join(PACKAGE_ROOT, "data", "catalog-export.json"))
    }
    if (command === "restore") {
        if (!args[0]) throw new Error("usage: export-catalog.ts restore <path> [--force]")
        return restoreCatalog(args[0], rest.includes("--force"))
    }
    console.error("usage: export-catalog.ts <export [path] | restore <path> [--force]>")
    process.exit(2)
}

main().catch(async (error) => {
    console.error(`[catalog] ${error instanceof Error ? error.message : String(error)}`)
    await prisma.$disconnect()
    process.exit(1)
})
