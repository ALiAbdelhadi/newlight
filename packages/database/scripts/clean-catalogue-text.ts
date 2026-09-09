import { createPrismaClient } from "../prisma-client"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const APPLY = process.argv.includes("--apply")

const WESTERN = /[0-9]/
const LATIN = /[A-Za-z]/

const MEASUREMENT_SPECS = new Set([
    "maximum_wattage",
    "life_time",
    "beam_angle",
    "luminous_flux",
    "power_factor",
    "cri",
    "voltage",
    "product_dimensions",
    "hole_size",
    "colour_temperature",
    "color_temperature",
    "input_voltage",
    "frequency",
])

function toArabicDigits(value: string): string {
    return value.replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)))
}

export function arabiseValue(specKey: string, value: string): string | null {
    if (!MEASUREMENT_SPECS.has(specKey)) return null
    if (!WESTERN.test(value)) return null

    let next = value
    if (specKey === "product_dimensions") next = next.replace(/\s*[xX]\s*/g, "×")
    if (LATIN.test(next)) return null

    next = toArabicDigits(next)
    return next === value ? null : next
}

export function modelCode(slug: string): string {
    return slug.replace(/^nl-/, "").toUpperCase()
}

export function familyName(sectionName: string, slug: string): string {
    const code = modelCode(slug)
    const section = sectionName.trim().replace(/\s+/g, " ")
    if (!section) return code

    const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "")
    if (compact(section).includes(compact(code))) return section

    return `${section} ${code}`
}

async function main() {
    const prisma = createPrismaClient()
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")

    const families = await prisma.productFamily.findMany({
        where: { isActive: true, deletedAt: null },
        include: {
            translations: true,
            subCategory: { include: { translations: true } },
        },
        orderBy: { slug: "asc" },
    })

    const familyEdits: Array<{ id: string; locale: string; slug: string; from: string; to: string }> = []
    for (const family of families) {
        for (const translation of family.translations) {
            if (translation.name !== family.slug) continue
            const section = family.subCategory.translations.find((t) => t.locale === translation.locale)
            const next = familyName(section?.name ?? "", family.slug)
            if (next && next !== translation.name) {
                familyEdits.push({
                    id: translation.id,
                    locale: translation.locale,
                    slug: family.slug,
                    from: translation.name,
                    to: next,
                })
            }
        }
    }

    const specs = await prisma.productSpec.findMany({
        where: { valueAr: { not: null } },
        select: { id: true, specKey: true, valueAr: true, valueEn: true },
    })

    const specEdits: Array<{ id: string; specKey: string; from: string; to: string }> = []
    for (const spec of specs) {
        if (!spec.valueAr) continue
        const next = arabiseValue(spec.specKey, spec.valueAr)
        if (next) specEdits.push({ id: spec.id, specKey: spec.specKey, from: spec.valueAr, to: next })
    }

    console.log(`\n=== FAMILY NAMES (${familyEdits.length} rows) ===`)
    for (const edit of familyEdits.slice(0, 200)) {
        console.log(`  [${edit.locale}] ${edit.from.padEnd(22)} -> ${edit.to}`)
    }

    console.log(`\n=== ARABIC DIGITS (${specEdits.length} rows) ===`)
    const bySpec = new Map<string, { count: number; sample: { from: string; to: string } }>()
    for (const edit of specEdits) {
        const entry = bySpec.get(edit.specKey) ?? { count: 0, sample: { from: edit.from, to: edit.to } }
        entry.count += 1
        bySpec.set(edit.specKey, entry)
    }
    for (const [key, entry] of [...bySpec.entries()].sort((a, b) => b[1].count - a[1].count)) {
        console.log(`  ${key.padEnd(24)} ${String(entry.count).padEnd(5)} e.g. "${entry.sample.from}" -> "${entry.sample.to}"`)
    }

    const untouched = specs.filter((s) => s.valueAr && WESTERN.test(s.valueAr) && !arabiseValue(s.specKey, s.valueAr))
    const untouchedKeys = new Map<string, string>()
    for (const spec of untouched) if (!untouchedKeys.has(spec.specKey)) untouchedKeys.set(spec.specKey, spec.valueAr!)
    console.log(`\n=== LEFT ALONE (${untouched.length} rows with Western digits) ===`)
    for (const [key, sample] of untouchedKeys) console.log(`  ${key.padEnd(24)} e.g. "${sample}"`)

    if (!APPLY) {
        console.log(`\nDRY RUN. Nothing written. Re-run with --apply to write.`)
        await prisma.$disconnect()
        return
    }

    const dir = join("scripts", "backups")
    mkdirSync(dir, { recursive: true })
    const backup = join(dir, `catalogue-text-${stamp}.json`)
    writeFileSync(backup, JSON.stringify({ familyEdits, specEdits }, null, 2))
    console.log(`\nbackup written: ${backup}`)

    const CHUNK = 50
    for (let i = 0; i < familyEdits.length; i += CHUNK) {
        const chunk = familyEdits.slice(i, i + CHUNK)
        await prisma.$transaction(
            chunk.map((edit) =>
                prisma.productFamilyTranslation.update({ where: { id: edit.id }, data: { name: edit.to } })
            )
        )
    }
    console.log(`family names updated: ${familyEdits.length}`)

    for (let i = 0; i < specEdits.length; i += CHUNK) {
        const chunk = specEdits.slice(i, i + CHUNK)
        await prisma.$transaction(
            chunk.map((edit) => prisma.productSpec.update({ where: { id: edit.id }, data: { valueAr: edit.to } }))
        )
    }
    console.log(`spec values updated: ${specEdits.length}`)

    await prisma.$disconnect()
}

void main()
