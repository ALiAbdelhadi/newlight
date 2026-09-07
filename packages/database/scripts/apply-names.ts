/**
 * Write reviewed product names — the second half of A26.
 *
 *   pnpm --filter @repo/database names:apply [--dry]
 *
 * Reads `data/name-proposals.json` and writes `proposedEn` / `proposedAr` into
 * `ProductTranslation.name`. Separate from `names:propose` on purpose: generating a name and
 * committing it to the catalogue are different decisions, and the file in between is where a
 * person makes the second one.
 *
 * It REFUSES to write any row still carrying `needsReview`. Clear the field to accept the
 * proposal as it stands — that is the acknowledgement, and it has to be deliberate.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PACKAGE_ROOT } from "../media"

interface Proposal {
    sku: string
    proposedEn: string
    proposedAr: string
    needsReview: string | null
}

async function main() {
    const dry = process.argv.includes("--dry")
    const file = join(PACKAGE_ROOT, "data", "name-proposals.json")
    const { proposals } = JSON.parse(readFileSync(file, "utf8")) as { proposals: Proposal[] }

    const ready = proposals.filter((p) => !p.needsReview && p.proposedEn.trim() && p.proposedAr.trim())
    const held = proposals.length - ready.length

    const prisma = new PrismaClient()
    let written = 0
    let unchanged = 0
    const missing: string[] = []

    for (const proposal of ready) {
        const product = await prisma.product.findUnique({
            where: { productId: proposal.sku },
            select: { id: true, translations: { select: { locale: true, name: true } } },
        })
        if (!product) {
            missing.push(proposal.sku)
            continue
        }

        const current = new Map(product.translations.map((t) => [t.locale, t.name]))
        if (current.get("en") === proposal.proposedEn && current.get("ar") === proposal.proposedAr) {
            unchanged++
            continue
        }

        if (!dry) {
            await prisma.$transaction([
                prisma.productTranslation.update({
                    where: { productId_locale: { productId: product.id, locale: "en" } },
                    data: { name: proposal.proposedEn },
                }),
                prisma.productTranslation.update({
                    where: { productId_locale: { productId: product.id, locale: "ar" } },
                    data: { name: proposal.proposedAr },
                }),
            ])
        }
        written++
    }

    console.log("")
    console.log(`  ${proposals.length} proposals in the file`)
    console.log(`  ${held} held back — they still carry needsReview`)
    console.log(`  ${written} ${dry ? "would be written" : "written"}`)
    console.log(`  ${unchanged} already match`)
    if (missing.length) console.log(`  ${missing.length} SKUs are not in the catalogue: ${missing.slice(0, 5).join(", ")}`)
    console.log("")

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error(`[names] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
})
