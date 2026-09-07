import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "./harness"

/**
 * §12 / §25: the chain itself.
 *
 * `pnpm db:verify-chain` proves that replaying the migrations reproduces schema.prisma. These
 * assert the things that proof cannot see: the reference data the migrations seed, the CHECK
 * constraints `migrate diff` is blind to (A22), and 0011's refusal to run before the transform.
 */
let db: TestDatabase

beforeAll(async () => { db = await createTestDatabase() })
afterAll(async () => db?.drop())

describe("reference data the migrations seed", () => {
    it("seeds the five colour keys, verbatim (§8)", async () => {
        const colors = await db.prisma.productColor.findMany({ orderBy: { order: "asc" } })
        // Preserved exactly, because cart and order snapshots store these strings.
        expect(colors.map((c) => c.key)).toEqual(["BLACK", "GRAY", "WHITE", "GOLD", "WOOD"])
        expect(colors.every((c) => /^#[0-9A-F]{6}$/.test(c.hex))).toBe(true)
        expect(colors.every((c) => c.nameAr.length > 0 && c.nameEn.length > 0)).toBe(true)
    })

    it("seeds the 15 spec definitions with both labels and both units", async () => {
        const definitions = await db.prisma.specDefinition.findMany({ orderBy: { order: "asc" } })
        expect(definitions).toHaveLength(15)
        for (const definition of definitions) {
            expect(definition.labelEn.length).toBeGreaterThan(0)
            expect(definition.labelAr.length).toBeGreaterThan(0)
            // An Arabic label written in Latin script would mean the transform mapped the
            // wrong column.
            expect(definition.labelAr).toMatch(/[؀-ۿ]/)
        }
    })

    it("carries the approved label corrections (A1-A3, round-3 review)", async () => {
        const byKey = new Map((await db.prisma.specDefinition.findMany()).map((d) => [d.key, d]))
        expect(byKey.get("voltage")!.labelEn).toBe("Input Voltage")
        expect(byKey.get("voltage")!.labelAr).toBe("جهد الدخل")
        // اللومن is the UNIT; using it as the label renders "اللومن: 3000 lm".
        expect(byKey.get("luminous_flux")!.labelAr).toBe("التدفق الضوئي")
        expect(byKey.get("luminous_flux")!.unitAr).toBe("lm")
        expect(byKey.get("max_ip_rating")!.labelAr).toBe("أقصى درجة الحماية")
        expect(byKey.get("driver")!.labelAr).toBe("ترانس أو بطارية")
        expect(byKey.get("ip_rating")!.valueType).toBe("TEXT")
    })

    it("seeds exactly one default location", async () => {
        const locations = await db.prisma.location.findMany()
        expect(locations).toHaveLength(1)
        expect(locations[0]!.id).toBe("location_main")
        expect(locations[0]!.isDefault).toBe(true)
    })
})

describe("constraints migrate diff cannot see (A22)", () => {
    /**
     * An exact list, not a count.
     *
     * It was written as a list of four and failed the moment `0014` added a fifth for
     * `rate_limits` — correctly, because a CHECK constraint appearing without anyone noticing
     * is exactly what this exists to catch. The answer is to name the new one, not to loosen
     * the assertion into a count that any constraint could satisfy.
     */
    it("has exactly the check constraints the chain declares", async () => {
        const rows = await db.prisma.$queryRaw<Array<{ name: string }>>`
            SELECT conname AS name FROM pg_constraint
             WHERE contype = 'c' AND connamespace = 'public'::regnamespace`
        expect(rows.map((r) => r.name).sort()).toEqual([
            // §4.6 — the four the schema cannot express in Prisma.
            "products_price_positive",
            // 0014 — a rate-limit counter cannot go negative.
            "rate_limits_count_non_negative",
            "stock_levels_on_hand_non_negative",
            "stock_levels_reserved_non_negative",
            "stock_levels_reserved_within_stock",
        ])
    })
})

describe("what 0011 destroyed, and what it kept", () => {
    it("has removed every v1 catalog column", async () => {
        const rows = await db.prisma.$queryRaw<Array<{ column_name: string }>>`
            SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'products'`
        const columns = new Set(rows.map((r) => r.column_name))
        for (const gone of ["images", "inventory", "availableColors", "colorImageMap", "baseProductId", "variantType", "voltage", "ipRating", "maxWattage"]) {
            expect(columns.has(gone)).toBe(false)
        }
        // And kept what is identity or state (§2.2).
        for (const kept of ["productId", "slug", "familyId", "colorTemperatures", "price", "averageCost", "deletedAt"]) {
            expect(columns.has(kept)).toBe(true)
        }
    })

    it("has pruned OrderStatus to the four values anything ever used", async () => {
        const rows = await db.prisma.$queryRaw<Array<{ label: string }>>`
            SELECT enumlabel AS label FROM pg_enum e
              JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'order_status' ORDER BY e.enumsortorder`
        expect(rows.map((r) => r.label)).toEqual(["awaiting_shipment", "shipped", "delivered", "cancelled"])
    })

    it("makes the taxonomy slugs NOT NULL", async () => {
        const rows = await db.prisma.$queryRaw<Array<{ is_nullable: string }>>`
            SELECT is_nullable FROM information_schema.columns
             WHERE table_name = 'category_translations' AND column_name = 'slug'`
        expect(rows[0]!.is_nullable).toBe("NO")
    })
})
