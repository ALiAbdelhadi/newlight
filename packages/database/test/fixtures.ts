import type { PrismaClient } from "@prisma/client"
import { recordMovement } from "../inventory"

/**
 * The smallest catalog that exercises every v2 relationship.
 *
 * Small on purpose. A fixture that mirrors production is a second copy of production to keep
 * in sync, and tests that depend on 189 specific products fail for reasons that have nothing
 * to do with the code under test. This has one family with two variants, one singleton, both
 * locales throughout, and one product with a deliberate data defect — the `false` boolean that
 * N4 says to carry across rather than repair.
 */

export const LOCATION_ID = "location_main"

export interface Fixture {
    categoryId: string
    subCategoryId: string
    familyId: string
    /** Two variants of one family, plus a singleton. */
    products: { small: string; large: string; single: string }
    skus: { small: string; large: string; single: string }
    userId: string
}

export async function seedFixture(prisma: PrismaClient): Promise<Fixture> {
    // Colours, spec definitions and the default location arrive with the migrations (0005,
    // 0006, 0009) — they are reference data, not fixture data, and seeding them again here
    // would let a test pass against values the migration does not actually produce.

    const category = await prisma.category.create({
        data: {
            imageUrl: "/c.png",
            translations: {
                create: [
                    { locale: "en", slug: "indoor", name: "Indoor Lighting", description: "Inside" },
                    { locale: "ar", slug: "اضاءه-داخليه", name: "إضاءة داخلية", description: "بالداخل" },
                ],
            },
        },
    })

    const subCategory = await prisma.subCategory.create({
        data: {
            categoryId: category.id,
            translations: {
                create: [
                    { locale: "en", slug: "panel", name: "Panel Lights" },
                    { locale: "ar", slug: "بانل-لايت", name: "بانل لايت" },
                ],
            },
        },
    })

    const family = await prisma.productFamily.create({
        data: {
            subCategoryId: subCategory.id,
            slug: "nl-test",
            variantType: "wattage",
            translations: {
                create: [
                    { locale: "en", slug: "nl-test", name: "nl-test" },
                    { locale: "ar", slug: "nl-test-ar", name: "nl-test" },
                ],
            },
        },
    })

    const black = await prisma.productColor.findUniqueOrThrow({ where: { key: "BLACK" } })

    async function product(sku: string, price: string, familyId: string | null, variantValue: string | null) {
        return prisma.product.create({
            data: {
                productId: sku,
                slug: sku,
                subCategoryId: subCategory.id,
                familyId,
                variantValue,
                price,
                colorTemperatures: ["WARM_3000K", "COOL_4000K"],
                translations: {
                    create: [
                        { locale: "en", name: sku, description: `${sku} description` },
                        { locale: "ar", name: sku, description: `وصف ${sku}` },
                    ],
                },
                images: {
                    create: [
                        { url: `/${sku}-0.png`, publicId: `${sku}-0`, order: 0, width: 800, height: 600 },
                        { url: `/${sku}-1.png`, publicId: `${sku}-1`, order: 1 },
                    ],
                },
                availableColors: { create: [{ colorId: black.id, order: 0 }] },
            },
        })
    }

    const small = await product("nl-test-5w", "150.00", family.id, "5w")
    const large = await product("nl-test-10w", "199.50", family.id, "10w")
    const single = await product("nl-single", "1000.00", null, null)

    // Specs, including the N4 defect: a boolean where TEXT belongs, carried verbatim.
    await prisma.productSpec.createMany({
        data: [
            { productId: small.id, specKey: "maximum_wattage", valueEn: "5", valueAr: "٥", valueNumber: "5" },
            { productId: small.id, specKey: "ip_rating", valueEn: "IP20", valueAr: "IP20" },
            { productId: small.id, specKey: "life_time", valueEn: "50000", valueAr: "٥٠٠٠٠", valueNumber: "50000" },
            { productId: small.id, specKey: "hole_size", valueEn: "-", valueAr: "-" },
            { productId: large.id, specKey: "maximum_wattage", valueEn: "10", valueAr: "١٠", valueNumber: "10" },
            { productId: large.id, specKey: "ip_rating", valueEn: "IP65", valueAr: "IP65" },
            { productId: single.id, specKey: "main_material", valueEn: "false", valueAr: "false", valueBool: false },
        ],
    })

    // A retired slug, so the 301 path has something to resolve.
    await prisma.productSlugHistory.create({ data: { productId: small.id, slug: "nl-test-5w-old" } })
    await prisma.taxonomySlugHistory.create({
        data: { locale: "en", slug: "panel-old", entityType: "SUB_CATEGORY", entityId: subCategory.id },
    })

    const user = await prisma.user.create({
        data: { email: "customer@newlight.invalid", name: "Test Customer", emailVerified: true, preferredLanguage: "ar" },
    })

    return {
        categoryId: category.id,
        subCategoryId: subCategory.id,
        familyId: family.id,
        products: { small: small.id, large: large.id, single: single.id },
        skus: { small: "nl-test-5w", large: "nl-test-10w", single: "nl-single" },
        userId: user.id,
    }
}

/** Opening stock, through the ledger — never by writing stock_levels directly. */
export async function seedStock(prisma: PrismaClient, productId: string, quantity: number) {
    return prisma.$transaction((tx) =>
        recordMovement(tx, {
            productId,
            locationId: LOCATION_ID,
            type: "INITIAL",
            quantity,
            reason: "test fixture opening stock",
            actorType: "SYSTEM",
        })
    )
}
