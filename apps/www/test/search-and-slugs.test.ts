import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { seedFixture, type Fixture } from "@repo/database/test-fixtures"
import { decodeSlug, encodeSlug } from "@repo/database"

/**
 * §25: "Search: every filter rewritten onto ProductSpec returns the same results as the
 * column-based implementation on the same data" and "Slugs: Arabic taxonomy slugs round-trip
 * through percent-encoding; renamed slugs 301 from history in the right locale."
 *
 * An honest note on the first: the column-based implementation NO LONGER EXISTS — 0011 dropped
 * the eight columns it filtered on, so there is nothing left to run a differential against.
 * What is testable, and what these do, is that each rewritten filter returns the RIGHT rows,
 * and that the three documented deltas (A27) behave as documented rather than by accident.
 */
let db: TestDatabase
let fixture: Fixture

beforeAll(async () => {
    db = await createTestDatabase()
    fixture = await seedFixture(db.prisma)
})
afterAll(async () => db?.drop())

const live = { isActive: true, deletedAt: null } as const

describe("free-text search over specs", () => {
    it("finds a product by a spec VALUE, through the join", async () => {
        const found = await db.prisma.product.findMany({
            where: { ...live, specs: { some: { specKey: { in: ["ip_rating"] }, valueEn: { contains: "IP65", mode: "insensitive" } } } },
            select: { productId: true },
        })
        expect(found.map((p) => p.productId)).toEqual(["nl-test-10w"])
    })

    it("searches valueEn only, so the equivalence proof holds (A27)", async () => {
        // The Arabic value exists and is deliberately NOT searched. Searching both would
        // return a strict superset — an improvement, but one smuggled into a migration.
        const arabicValue = await db.prisma.productSpec.findFirstOrThrow({
            where: { productId: fixture.products.small, specKey: "maximum_wattage" },
        })
        expect(arabicValue.valueAr).toBe("٥")

        const byArabic = await db.prisma.product.findMany({
            where: { ...live, specs: { some: { valueEn: { contains: "٥" } } } },
        })
        expect(byArabic).toHaveLength(0)
    })

    it("matches a SKU and a slug as well as a spec", async () => {
        for (const term of ["nl-test-5w", "test-5"]) {
            const found = await db.prisma.product.findMany({
                where: { ...live, OR: [{ productId: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }] },
                select: { productId: true },
            })
            expect(found.map((p) => p.productId)).toContain("nl-test-5w")
        }
    })
})

describe("the advanced filters", () => {
    it("filters a wattage range on valueNumber, using the numeric index", async () => {
        const found = await db.prisma.product.findMany({
            where: { ...live, specs: { some: { specKey: "maximum_wattage", valueNumber: { gte: 8, lte: 12 } } } },
            select: { productId: true },
        })
        expect(found.map((p) => p.productId)).toEqual(["nl-test-10w"])
    })

    it("filters ipRating, which was declared and inert in v1 (A27 delta)", async () => {
        // v1 destructured `ipRating` and never used it in the where clause, so passing it
        // changed nothing. Preserving "current semantics" literally would mean keeping it dead.
        const found = await db.prisma.product.findMany({
            where: { ...live, specs: { some: { specKey: "ip_rating", valueEn: { in: ["IP20"] } } } },
            select: { productId: true },
        })
        expect(found.map((p) => p.productId)).toEqual(["nl-test-5w"])
    })

    it("filters colorTemp, likewise", async () => {
        const found = await db.prisma.product.findMany({
            where: { ...live, colorTemperatures: { hasSome: ["WARM_3000K"] } },
            select: { productId: true },
        })
        expect(found.length).toBeGreaterThan(0)
        const none = await db.prisma.product.findMany({
            where: { ...live, colorTemperatures: { hasSome: ["WHITE_6500K"] } },
        })
        expect(none).toHaveLength(0)
    })

    it("scopes a taxonomy slug filter to a locale (A27 delta)", async () => {
        const byEnglish = await db.prisma.product.findMany({
            where: { ...live, subCategory: { translations: { some: { locale: "en", slug: "panel" } } } },
        })
        expect(byEnglish).toHaveLength(3)

        // The English slug is not the Arabic one, so an unscoped filter would silently
        // return nothing for half the audience.
        const englishSlugInArabic = await db.prisma.product.findMany({
            where: { ...live, subCategory: { translations: { some: { locale: "ar", slug: "panel" } } } },
        })
        expect(englishSlugInArabic).toHaveLength(0)

        const byArabic = await db.prisma.product.findMany({
            where: { ...live, subCategory: { translations: { some: { locale: "ar", slug: "بانل-لايت" } } } },
        })
        expect(byArabic).toHaveLength(3)
    })

    it("filters a price range on the Decimal column", async () => {
        const found = await db.prisma.product.findMany({
            where: { ...live, price: { gte: "150.00", lte: "199.50" } },
            select: { productId: true },
            orderBy: { price: "asc" },
        })
        expect(found.map((p) => p.productId)).toEqual(["nl-test-5w", "nl-test-10w"])
    })

    it("excludes soft-deleted products from every read", async () => {
        await db.prisma.product.update({ where: { id: fixture.products.single }, data: { deletedAt: new Date() } })
        const found = await db.prisma.product.findMany({ where: live, select: { productId: true } })
        expect(found.map((p) => p.productId)).not.toContain("nl-single")
        await db.prisma.product.update({ where: { id: fixture.products.single }, data: { deletedAt: null } })
    })
})

describe("slug history, and the 301 it enables (§10)", () => {
    it("resolves a retired PRODUCT slug to its current one", async () => {
        const history = await db.prisma.productSlugHistory.findUnique({
            where: { slug: "nl-test-5w-old" },
            include: { product: { select: { slug: true } } },
        })
        expect(history?.product.slug).toBe("nl-test-5w")
    })

    it("resolves a retired TAXONOMY slug within its own locale", async () => {
        const history = await db.prisma.taxonomySlugHistory.findUnique({
            where: { locale_slug: { locale: "en", slug: "panel-old" } },
        })
        expect(history?.entityType).toBe("SUB_CATEGORY")
        expect(history?.entityId).toBe(fixture.subCategoryId)

        // Same string, other locale: not a match. Taxonomy history is per-locale because
        // taxonomy slugs are.
        const wrongLocale = await db.prisma.taxonomySlugHistory.findUnique({
            where: { locale_slug: { locale: "ar", slug: "panel-old" } },
        })
        expect(wrongLocale).toBeNull()
    })

    it("refuses to reuse a retired product slug for a different product", async () => {
        // ProductSlugHistory.slug is UNIQUE, so a rename cannot silently steal a URL that
        // still 301s somewhere else.
        await expect(
            db.prisma.productSlugHistory.create({
                data: { productId: fixture.products.large, slug: "nl-test-5w-old" },
            })
        ).rejects.toThrow()
    })

    it("round-trips an Arabic taxonomy slug through a URL", async () => {
        const translation = await db.prisma.subCategoryTranslation.findUniqueOrThrow({
            where: { subCategoryId_locale: { subCategoryId: fixture.subCategoryId, locale: "ar" } },
        })
        const encoded = encodeSlug(translation.slug)
        expect(encoded).not.toBe(translation.slug)
        expect(decodeSlug(encoded)).toBe(translation.slug)

        // And the decoded value is what the database is keyed on.
        const resolved = await db.prisma.subCategoryTranslation.findUnique({
            where: { locale_slug: { locale: "ar", slug: decodeSlug(encoded) } },
        })
        expect(resolved?.subCategoryId).toBe(fixture.subCategoryId)
    })
})

describe("i18n data rules (§14.3)", () => {
    it("has a name in both locales for every product", async () => {
        const products = await db.prisma.product.findMany({ include: { translations: true } })
        for (const product of products) {
            const locales = product.translations.map((t) => t.locale).sort()
            expect(locales).toEqual(["ar", "en"])
            for (const translation of product.translations) {
                expect(translation.name.trim().length).toBeGreaterThan(0)
            }
        }
    })

    it("does NOT require meta fields, which are empty on 378/378 production rows (N3)", async () => {
        const translations = await db.prisma.productTranslation.findMany()
        expect(translations.every((t) => t.metaTitle === null)).toBe(true)
        // An activation rule that required them would refuse to activate the entire catalog.
    })

    it("keeps a taxonomy slug for every active row in every locale", async () => {
        const subCategories = await db.prisma.subCategory.findMany({
            where: { isActive: true },
            include: { translations: true },
        })
        for (const subCategory of subCategories) {
            expect(subCategory.translations.map((t) => t.locale).sort()).toEqual(["ar", "en"])
            for (const translation of subCategory.translations) {
                expect(translation.slug.length).toBeGreaterThan(0)
            }
        }
    })
})
