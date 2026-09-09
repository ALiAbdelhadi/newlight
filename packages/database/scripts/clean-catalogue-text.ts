/**
 * Catalogue text clean-up: family names, and Arabic-Indic digits in Arabic spec values.
 *
 *   pnpm --filter @repo/database clean:text            # dry run, prints every change
 *   pnpm --filter @repo/database clean:text -- --apply # writes, after backing up
 *
 * DRY RUN BY DEFAULT. `--apply` writes a JSON backup of every row it is about to touch to
 * `scripts/backups/` first, so any of this can be put back exactly as it was.
 *
 * Two problems, both data rather than code:
 *
 *   FAMILY NAMES. 176 of 178 `ProductFamilyTranslation.name` rows are a verbatim copy of the
 *   family slug, so a listing tile — which stands for the family, not one variant — is labelled
 *   `nl-a603`. The two rows that are NOT a copy of the slug are somebody's real answer and are
 *   left alone; this only fills in the ones nobody has named.
 *
 *   ARABIC DIGITS. `valueAr` is mixed: `cri` reads "≥ ٨٠" on 137 rows and ">80" on 19, and one
 *   Arabic product page prints "تيار متردد ٨٥–٢٦٥ فولت" on one line and "6-8 W" on the next.
 *   The majority style, and the style of every other number the Arabic site renders, is
 *   Arabic-Indic.
 *
 * WHAT IT WILL NOT TOUCH, deliberately:
 *   - `slug` on anything. Slugs are URLs (§9.2) and `ProductSlugHistory` exists so they can be
 *     changed deliberately, with a redirect. This is a text tidy, not a migration.
 *   - `valueEn`, and `valueNumber` — the column the filters and sorts actually compare on.
 *     Nothing here can change which products match a filter.
 *   - IP ratings, and any value carrying Latin letters. "IP20" and "Lamp E27" are standard
 *     designations; "IP٢٠" is not a thing, and no Arabic row in this catalogue writes one.
 */
import { PrismaClient } from "@prisma/client"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const APPLY = process.argv.includes("--apply")

/* ------------------------------------------------------------ arabic digits */

const WESTERN = /[0-9]/
const LATIN = /[A-Za-z]/

/**
 * The spec keys whose Arabic value is a MEASUREMENT and nothing else.
 *
 * An allowlist rather than "everything numeric", because the difference between a quantity and
 * a designation is not visible in the value: "50000" hours should be Arabised and "IP20" must
 * not, and both are `valueAr` strings with digits in them.
 */
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

/**
 * The Arabic form of one value, or null when it should be left alone.
 *
 * `x` becomes `×` only in dimensions, and only because that is what the 15 rows already written
 * in Arabic-Indic use — "١١٥×٢٢×٢٥ مللي". It is the existing convention, not a new one.
 */
export function arabiseValue(specKey: string, value: string): string | null {
    if (!MEASUREMENT_SPECS.has(specKey)) return null
    if (!WESTERN.test(value)) return null

    let next = value
    if (specKey === "product_dimensions") next = next.replace(/\s*[xX]\s*/g, "×")
    // Anything still carrying Latin letters is a designation, not a measurement.
    if (LATIN.test(next)) return null

    next = toArabicDigits(next)
    return next === value ? null : next
}

/* ------------------------------------------------------------ family names */

/**
 * A family's model code, from its slug.
 *
 * `nl-a603` → `A603`, `nl-tr1001-220v` → `TR1001-220V`, `nl-s-l-2` → `S-L-2`. The hyphens are
 * kept: they are part of how these codes are written on the products themselves, and turning
 * them into spaces produces "S L 2", which reads as three words.
 */
export function modelCode(slug: string): string {
    return slug.replace(/^nl-/, "").toUpperCase()
}

/**
 * The name a family gets: its section, then its model code.
 *
 * This DERIVES rather than invents. "Magnetic Track A603" is what the family is — the section
 * an operator filed it under and the code printed on the fixture — and it is the most a script
 * can honestly say without being told the marketing name. The moment somebody types a better
 * one in the panel, this script leaves it alone, because it only fills rows whose name is still
 * a copy of the slug.
 *
 * A section name that already ends in the code is not repeated: "Floodlight" under a section
 * called "Flood Lights" becomes "Flood Lights" rather than "Flood Lights FLOODLIGHT".
 */
export function familyName(sectionName: string, slug: string): string {
    const code = modelCode(slug)
    const section = sectionName.trim().replace(/\s+/g, " ")
    if (!section) return code

    const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "")
    // The code adds nothing when the section already says it.
    if (compact(section).includes(compact(code))) return section

    return `${section} ${code}`
}

/* -------------------------------------------------------------------- main */

async function main() {
    const prisma = new PrismaClient()
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")

    /* ---- families ---- */
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
            // Somebody's real answer stays. Only a name that is still the slug is unnamed.
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

    /* ---- arabic digits ---- */
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

    /* ---- report ---- */
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

    /* ---- backup, then write ---- */
    const dir = join("scripts", "backups")
    mkdirSync(dir, { recursive: true })
    const backup = join(dir, `catalogue-text-${stamp}.json`)
    writeFileSync(backup, JSON.stringify({ familyEdits, specEdits }, null, 2))
    console.log(`\nbackup written: ${backup}`)

    // Chunked rather than one transaction per row: 1,000+ round trips to a pooled Neon endpoint
    // is minutes, and each chunk is independently safe to retry because every write is an
    // idempotent set-to-a-known-value.
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
