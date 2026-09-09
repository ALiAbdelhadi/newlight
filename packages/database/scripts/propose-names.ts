import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT } from "../media"

const prisma = new PrismaClient()

function singular(name: string): string {
    if (/ies$/.test(name)) return name.replace(/ies$/, "y")
    if (/(ss|us|is)$/.test(name)) return name
    return name.replace(/s$/, "")
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
function toArabicDigits(value: string): string {
    return value.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]!)
}

function wattageFromVariant(variant: string | null): string | null {
    if (!variant) return null
    const match = /^(\d+(?:\.\d+)?)\s*w$/i.exec(variant.trim())
    return match ? match[1]! : null
}

function sizeLabel(dimensions: string | null): string | null {
    if (!dimensions) return null
    const mm = [...dimensions.matchAll(/(\d{2,4})/g)].map((m) => Number(m[1]))
    if (mm.length < 2) return null
    const [a, b] = mm
    if (!a || !b) return null
    const cm = (value: number) => Math.round(value / 100)
    if (cm(a) >= 1 && cm(b) >= 1 && Math.abs(cm(a) - cm(b)) <= 1) return `${cm(a)}×${cm(b)}`
    return null
}

interface Proposal {
    sku: string
    subCategoryEn: string
    subCategoryAr: string
    currentEn: string
    currentAr: string
    proposedEn: string
    proposedAr: string
    basis: string
    needsReview: string | null
}

async function main() {
    const products = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { productId: "asc" },
        select: {
            productId: true,
            variantValue: true,
            translations: { select: { locale: true, name: true } },
            subCategory: { select: { translations: { select: { locale: true, name: true } } } },
            specs: { select: { specKey: true, valueEn: true } },
        },
    })

    const proposals: Proposal[] = []

    for (const product of products) {
        const subEn = (product.subCategory.translations.find((t) => t.locale === "en")?.name ?? "").trim()
        const subAr = (product.subCategory.translations.find((t) => t.locale === "ar")?.name ?? "").trim()
        const specs = new Map(product.specs.map((s) => [s.specKey, s.valueEn]))

        const variantWattage = wattageFromVariant(product.variantValue)
        const specWattage = specs.get("maximum_wattage")?.trim() ?? null
        const size = sizeLabel(specs.get("product_dimensions") ?? null)

        const notes: string[] = []
        if (!subEn || !subAr) notes.push("the sub-category has no name in one of the locales")

        if (variantWattage && specWattage && variantWattage !== specWattage) {
            notes.push(`SKU says ${variantWattage}W, maximum_wattage says ${specWattage}W`)
        }

        const wattage = variantWattage ?? (specWattage && /^\d/.test(specWattage) ? specWattage : null)

        let proposedEn: string
        let proposedAr: string
        let basis: string

        if (wattage) {
            proposedEn = `${wattage}W ${singular(subEn)}`.trim()
            proposedAr = `${subAr} ${toArabicDigits(wattage)} وات`.trim()
            basis = variantWattage ? "SKU variant" : "maximum_wattage"
        } else if (size) {
            proposedEn = `${size} ${singular(subEn)}`.trim()
            proposedAr = `${subAr} ${toArabicDigits(size.replace("×", "×"))}`.trim()
            basis = "product_dimensions"
        } else {
            proposedEn = singular(subEn)
            proposedAr = subAr
            basis = "sub-category only"
            notes.push("no wattage and no usable size — this name does not distinguish it from its siblings")
        }

        proposals.push({
            sku: product.productId,
            subCategoryEn: subEn,
            subCategoryAr: subAr,
            currentEn: product.translations.find((t) => t.locale === "en")?.name ?? "",
            currentAr: product.translations.find((t) => t.locale === "ar")?.name ?? "",
            proposedEn,
            proposedAr,
            basis,
            needsReview: notes.length ? notes.join("; ") : null,
        })
    }

    function group(list: Proposal[]) {
        const byName = new Map<string, Proposal[]>()
        for (const item of list) byName.set(item.proposedEn, [...(byName.get(item.proposedEn) ?? []), item])
        return [...byName.values()].filter((items) => items.length > 1)
    }

    const dimensionBySku = new Map(
        products.map((product) => [
            product.productId,
            product.specs.find((s) => s.specKey === "product_dimensions")?.valueEn?.trim() ?? null,
        ])
    )

    function shortDimension(raw: string | null): string | null {
        if (!raw || raw === "-") return null
        const numbers = [...raw.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => m[1]!)
        if (numbers.length < 2) return null
        return `${numbers[0]}×${numbers[1]}`
    }

    for (const colliding of group(proposals)) {
        const dims = colliding.map((item) => shortDimension(dimensionBySku.get(item.sku) ?? null))
        if (dims.some((d) => d === null) || new Set(dims).size !== dims.length) continue

        for (const [index, item] of colliding.entries()) {
            item.proposedEn = `${item.proposedEn} ${dims[index]}`
            item.proposedAr = `${item.proposedAr} ${toArabicDigits(dims[index]!)}`
            item.basis = `${item.basis} + product_dimensions`
        }
    }

    const collisions = group(proposals)
    for (const colliding of collisions) {
        const skus = colliding.map((item) => item.sku)
        for (const item of colliding) {
            const note = `"${item.proposedEn}" is proposed for ${skus.length} products: ${skus.join(", ")}`
            item.needsReview = item.needsReview ? `${item.needsReview}; ${note}` : note
        }
    }

    const out = join(PACKAGE_ROOT, "data", "name-proposals.json")
    writeFileSync(
        out,
        JSON.stringify(
            {
                $comment: [
                    "PROPOSALS ONLY — nothing here has been written to the database.",
                    "Edit proposedEn / proposedAr freely, then apply with `pnpm names:apply`.",
                    "A26: every current name is the product's own SKU, in both languages.",
                ],
                generatedAt: new Date().toISOString(),
                proposals,
            },
            null,
            2
        ) + "\n"
    )

    const needing = proposals.filter((p) => p.needsReview).length
    const conflicts = proposals.filter((p) => p.needsReview?.includes("maximum_wattage says")).length

    console.log("")
    console.log(`  ${proposals.length} proposals written to data/name-proposals.json`)
    console.log(`  ${proposals.length - needing} are unambiguous`)
    console.log(`  ${needing} need a person, of which:`)
    console.log(`    ${conflicts} have a SKU that disagrees with their own recorded wattage`)
    console.log(`    ${collisions.length} proposed names are shared by more than one product`)
    console.log("")
    console.log("  Nothing was written to the database. Review the file, then `pnpm names:apply`.")
    console.log("")

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[names] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
