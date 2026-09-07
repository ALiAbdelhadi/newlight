import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { seedFixture, type Fixture } from "@repo/database/test-fixtures"

/**
 * The specification dictionary.
 *
 * `ProductSpec.specKey` references `SpecDefinition.key` with ON DELETE CASCADE, so deleting a
 * definition takes every product's value for it — silently, with no complaint from the
 * database. Most of what follows is about that one fact.
 */
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
    await db.prisma.subCategorySpec.deleteMany()
    await db.prisma.productSpec.deleteMany()
    await db.prisma.productImage.deleteMany()
    await db.prisma.productAvailableColor.deleteMany()
    await db.prisma.productSlugHistory.deleteMany()
    await db.prisma.taxonomySlugHistory.deleteMany()
    await db.prisma.product.deleteMany()
    await db.prisma.productFamily.deleteMany()
    await db.prisma.subCategory.deleteMany()
    await db.prisma.category.deleteMany()
    await db.prisma.user.deleteMany()
    fixture = await seedFixture(db.prisma)
})

async function service() {
    return (await import("@/lib/services/spec-definition-service")).SpecDefinitionService
}

const base = {
    valueType: "TEXT" as const,
    labelEn: "Housing Finish",
    labelAr: "تشطيب الجسم",
    unitEn: null,
    unitAr: null,
    order: 200,
}

describe("creating a specification", () => {
    it("creates one with both labels", async () => {
        const SpecDefinitionService = await service()
        await SpecDefinitionService.create({ ...base, key: "housing_finish" })

        const row = await db.prisma.specDefinition.findUniqueOrThrow({ where: { key: "housing_finish" } })
        expect(row.labelAr).toBe("تشطيب الجسم")
        expect(row.valueType).toBe("TEXT")
    })

    it("refuses a key that is not usable from SQL and filters", async () => {
        const SpecDefinitionService = await service()
        await expect(SpecDefinitionService.create({ ...base, key: "Housing Finish" })).rejects.toThrow(/not a valid key/)
        await expect(SpecDefinitionService.create({ ...base, key: "2watts" })).rejects.toThrow(/not a valid key/)
    })

    it("refuses one that is missing a language", async () => {
        const SpecDefinitionService = await service()
        await expect(
            SpecDefinitionService.create({ ...base, key: "finish_two", labelAr: "  " })
        ).rejects.toThrow(/both English and Arabic/)
    })

    it("refuses a key that already exists", async () => {
        const SpecDefinitionService = await service()
        await expect(SpecDefinitionService.create({ ...base, key: "ip_rating" })).rejects.toThrow(/already exists/)
    })
})

describe("deleting a specification cannot take product data with it", () => {
    it("refuses while any product has a value, and says how many", async () => {
        const SpecDefinitionService = await service()
        // The fixture gives two products an ip_rating.
        await expect(SpecDefinitionService.remove("ip_rating")).rejects.toThrow(/2 product\(s\) have a value/)

        expect(await db.prisma.specDefinition.count({ where: { key: "ip_rating" } })).toBe(1)
        expect(await db.prisma.productSpec.count({ where: { specKey: "ip_rating" } })).toBe(2)
    })

    it("refuses while a sub-category still asks for it", async () => {
        const SpecDefinitionService = await service()
        await SpecDefinitionService.create({ ...base, key: "unused_spec" })
        await SpecDefinitionService.setForSubCategory(fixture.subCategoryId, [
            { specKey: "unused_spec", required: false, order: 0 },
        ])

        await expect(SpecDefinitionService.remove("unused_spec")).rejects.toThrow(/still ask for/)
    })

    it("deletes one that nothing uses", async () => {
        const SpecDefinitionService = await service()
        await SpecDefinitionService.create({ ...base, key: "orphan_spec" })
        await SpecDefinitionService.remove("orphan_spec")

        expect(await db.prisma.specDefinition.count({ where: { key: "orphan_spec" } })).toBe(0)
        const audit = await db.prisma.adminAuditLog.findFirstOrThrow({ where: { action: "spec.delete" } })
        expect(audit.diff).toMatchObject({ irreversible: true })
    })
})

describe("changing a specification's type", () => {
    it("refuses TEXT to NUMBER when existing values are not numeric", async () => {
        const SpecDefinitionService = await service()
        // ip_rating holds "IP20" and "IP65" — text by nature.
        await expect(
            SpecDefinitionService.update("ip_rating", {
                valueType: "NUMBER",
                labelEn: "IP Rating",
                labelAr: "درجة الحماية",
                unitEn: null,
                unitAr: null,
                order: 100,
            })
        ).rejects.toThrow(/are not numeric/)
    })

    it("allows labels, units and order to change freely", async () => {
        const SpecDefinitionService = await service()
        await SpecDefinitionService.update("ip_rating", {
            valueType: "TEXT",
            labelEn: "Ingress Protection",
            labelAr: "درجة الحماية من الغبار والماء",
            unitEn: null,
            unitAr: null,
            order: 5,
        })

        const row = await db.prisma.specDefinition.findUniqueOrThrow({ where: { key: "ip_rating" } })
        expect(row.labelEn).toBe("Ingress Protection")
        expect(row.order).toBe(5)
    })
})

describe("what a sub-category asks for", () => {
    it("replaces the whole list, and keeps product values that are no longer asked for", async () => {
        const SpecDefinitionService = await service()

        await SpecDefinitionService.setForSubCategory(fixture.subCategoryId, [
            { specKey: "ip_rating", required: true, order: 0 },
            { specKey: "maximum_wattage", required: true, order: 1 },
        ])
        expect(await db.prisma.subCategorySpec.count({ where: { subCategoryId: fixture.subCategoryId } })).toBe(2)

        // Stop asking for ip_rating.
        await SpecDefinitionService.setForSubCategory(fixture.subCategoryId, [
            { specKey: "maximum_wattage", required: true, order: 0 },
        ])

        const assigned = await db.prisma.subCategorySpec.findMany({ where: { subCategoryId: fixture.subCategoryId } })
        expect(assigned.map((a) => a.specKey)).toEqual(["maximum_wattage"])

        // Unasking a question does not destroy the answers already given.
        expect(await db.prisma.productSpec.count({ where: { specKey: "ip_rating" } })).toBe(2)
    })

    it("records what changed, both sides", async () => {
        const SpecDefinitionService = await service()
        await SpecDefinitionService.setForSubCategory(fixture.subCategoryId, [
            { specKey: "ip_rating", required: true, order: 0 },
        ])
        await SpecDefinitionService.setForSubCategory(fixture.subCategoryId, [
            { specKey: "life_time", required: false, order: 0 },
        ])

        const audit = await db.prisma.adminAuditLog.findFirstOrThrow({
            where: { action: "subCategory.specs_set" },
            orderBy: { createdAt: "desc" },
        })
        expect(audit.diff).toMatchObject({ before: ["ip_rating"], after: ["life_time"] })
    })
})
