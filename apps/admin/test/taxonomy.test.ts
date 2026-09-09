import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { seedFixture, type Fixture } from "@repo/database/test-fixtures"

let db: TestDatabase
let fixture: Fixture

const holder = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@repo/database", async () => {
    const actual = await vi.importActual<typeof import("@repo/database")>("@repo/database")
    return { ...actual, get prisma() { return holder.client } }
})

beforeAll(async () => {
    db = await createTestDatabase()
    holder.client = db.prisma
})
afterAll(async () => db?.drop())

beforeEach(async () => {
    await db.prisma.adminAuditLog.deleteMany()
    await db.prisma.taxonomySlugHistory.deleteMany()
    await db.prisma.productSpec.deleteMany()
    await db.prisma.productImage.deleteMany()
    await db.prisma.productAvailableColor.deleteMany()
    await db.prisma.productSlugHistory.deleteMany()
    await db.prisma.product.deleteMany()
    await db.prisma.productFamily.deleteMany()
    await db.prisma.subCategory.deleteMany()
    await db.prisma.category.deleteMany()
    await db.prisma.user.deleteMany()
    fixture = await seedFixture(db.prisma)
})

async function service() {
    return (await import("@/lib/services/taxonomy-service")).TaxonomyService
}

const input = (en: string, ar: string) => ({
    imageUrl: null,
    order: 0,
    isActive: true,
    translations: {
        en: { slug: en, name: `${en} name`, description: null, metaTitle: null, metaDescription: null },
        ar: { slug: ar, name: `${ar} اسم`, description: null, metaTitle: null, metaDescription: null },
    },
})

describe("creating taxonomy", () => {
    it("creates a category in both locales at once", async () => {
        const TaxonomyService = await service()
        const created = await TaxonomyService.createCategory(input("commercial", "تجاري"))

        const translations = await db.prisma.categoryTranslation.findMany({
            where: { categoryId: created.id },
            orderBy: { locale: "asc" },
        })
        expect(translations.map((t) => `${t.locale}:${t.slug}`)).toEqual(["ar:تجاري", "en:commercial"])
    })

    it("refuses one that is missing a language", async () => {
        const TaxonomyService = await service()
        const broken = input("solar", "شمسي")
        broken.translations.ar.name = "   "
        await expect(TaxonomyService.createCategory(broken)).rejects.toThrow(/Arabic/)
    })

    it("refuses a slug another category already uses", async () => {
        const TaxonomyService = await service()
        await expect(TaxonomyService.createCategory(input("indoor", "جديد"))).rejects.toThrow(/already in use/)
    })
})

describe("renaming writes the redirect in the same transaction", () => {
    it("retires the old slug into history", async () => {
        const TaxonomyService = await service()
        const next = input("panel-lights", "بانل-جديد")
        const result = await TaxonomyService.updateSubCategory(fixture.subCategoryId, fixture.categoryId, next)

        expect(result.renamed).toHaveLength(2)

        const history = await db.prisma.taxonomySlugHistory.findMany({ orderBy: { slug: "asc" } })
        expect(history.map((h) => h.slug)).toContain("panel")
        expect(history.map((h) => h.slug)).toContain("بانل-لايت")
        expect(history.every((h) => h.entityType === "SUB_CATEGORY")).toBe(true)
    })

    it("refuses a slug that still redirects somewhere else", async () => {
        const TaxonomyService = await service()
        await expect(TaxonomyService.createCategory(input("panel-old", "قديم"))).rejects.toThrow(/still redirects/)
    })

    it("leaves history alone when the slug did not change", async () => {
        const TaxonomyService = await service()
        const before = await db.prisma.taxonomySlugHistory.count()
        const same = input("panel", "بانل-لايت")
        same.translations.en.name = "Renamed in English only"
        await TaxonomyService.updateSubCategory(fixture.subCategoryId, fixture.categoryId, same)

        expect(await db.prisma.taxonomySlugHistory.count()).toBe(before)
        const en = await db.prisma.subCategoryTranslation.findFirstOrThrow({
            where: { subCategoryId: fixture.subCategoryId, locale: "en" },
        })
        expect(en.name).toBe("Renamed in English only")
    })
})

describe("archiving refuses while anything lives inside", () => {
    it("will not archive a sub-category holding products, and says how many", async () => {
        const TaxonomyService = await service()
        await expect(TaxonomyService.archiveSubCategory(fixture.subCategoryId)).rejects.toThrow(/3 product/)
    })

    it("will not archive a category holding sub-categories", async () => {
        const TaxonomyService = await service()
        await expect(TaxonomyService.archiveCategory(fixture.categoryId)).rejects.toThrow(/sub-categor/)
    })

    it("archives an empty one, and restores it", async () => {
        const TaxonomyService = await service()
        const created = await TaxonomyService.createCategory(input("empty-cat", "فاضي"))

        await TaxonomyService.archiveCategory(created.id)
        let row = await db.prisma.category.findUniqueOrThrow({ where: { id: created.id } })
        expect(row.deletedAt).not.toBeNull()
        expect(row.isActive).toBe(false)

        await TaxonomyService.restore("category", created.id)
        row = await db.prisma.category.findUniqueOrThrow({ where: { id: created.id } })
        expect(row.deletedAt).toBeNull()
    })
})
