import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import {
    DEFAULT_SHIPPING_RATES,
    getShippingRates,
    serializeMoney,
    SHIPPING_OPTIONS,
    shippingRateKey,
} from "@repo/database"
import { cheapestShippingRate, type ShippingRates } from "@/lib/services/shipping-service"

/**
 * The storefront quotes shipping from the same rows the order is charged from.
 *
 * This exists because it did not. `components/confirm-form.tsx` held its own
 * `{ BasicShipping: { price: 50 }, ... }` while `order-service.ts` priced the order from
 * `getShippingRates`, and the two agreed only until somebody used the panel's rate editor.
 * Nothing failed when they diverged, which is why the divergence shipped.
 */
let db: TestDatabase
beforeAll(async () => {
    db = await createTestDatabase()
})
afterAll(async () => db?.drop())

async function rates(): Promise<ShippingRates> {
    const decimals = await getShippingRates(db.prisma)
    const out = {} as ShippingRates
    for (const option of SHIPPING_OPTIONS) out[option] = serializeMoney(decimals[option])
    return out
}

describe("shipping rates", () => {
    it("falls back to the defaults when nothing is stored", async () => {
        const quoted = await rates()
        for (const option of SHIPPING_OPTIONS) {
            expect(quoted[option]).toBe(serializeMoney(DEFAULT_SHIPPING_RATES[option]))
        }
    })

    it("quotes what the panel stored, not a constant in the form", async () => {
        // Exactly what the rate editor writes.
        await db.prisma.systemSetting.upsert({
            where: { key: shippingRateKey("StandardShipping") },
            create: { key: shippingRateKey("StandardShipping"), value: "137.50" },
            update: { value: "137.50" },
        })

        const quoted = await rates()
        expect(quoted.StandardShipping).toBe("137.50")
        // The number the checkout used to print. If this ever comes back, the bug is back.
        expect(quoted.StandardShipping).not.toBe("100.00")
    })

    it("takes the floor across the options for the cart's 'from' line", async () => {
        await db.prisma.systemSetting.upsert({
            where: { key: shippingRateKey("BasicShipping") },
            create: { key: shippingRateKey("BasicShipping"), value: "42.00" },
            update: { value: "42.00" },
        })
        expect(cheapestShippingRate(await rates())).toBe("42.00")
    })

    it("ignores a stored value that is not money rather than quoting NaN", async () => {
        await db.prisma.systemSetting.upsert({
            where: { key: shippingRateKey("ExpressShipping") },
            create: { key: shippingRateKey("ExpressShipping"), value: "not a number" },
            update: { value: "not a number" },
        })
        expect(cheapestShippingRate(await rates())).toBe("42.00")
        expect((await rates()).ExpressShipping).toBe(serializeMoney(DEFAULT_SHIPPING_RATES.ExpressShipping))
    })
})
