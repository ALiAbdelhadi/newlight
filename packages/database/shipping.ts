import type { PrismaClient, Prisma } from "@prisma/client"
import { money, type Money, type SerializedMoney } from "./money"

/**
 * Shipping rates.
 *
 * These lived as a three-line object literal inside the storefront's order service, which
 * meant the only way to change what a customer pays for delivery was a code change and a
 * deploy — and the admin panel's "Shipping" link went to a 404 that could not have edited
 * them anyway. They are settings, so they live in `system_settings`, and both apps read them
 * from here.
 *
 * The defaults are the values that were hard-coded, so a database with no rows behaves
 * exactly as the literal did.
 */

export const SHIPPING_OPTIONS = ["BasicShipping", "StandardShipping", "ExpressShipping"] as const
export type ShippingOption = (typeof SHIPPING_OPTIONS)[number]

export const DEFAULT_SHIPPING_RATES: Record<ShippingOption, SerializedMoney> = {
    BasicShipping: "50.00",
    StandardShipping: "100.00",
    ExpressShipping: "200.00",
}

export function shippingRateKey(option: ShippingOption): string {
    return `shipping.rate.${option}`
}

type Client = PrismaClient | Prisma.TransactionClient

/**
 * Reads all three at once. A per-option lookup would be three round trips on the checkout
 * path, and a missing row is a default rather than an error — a shipping rate that throws is
 * a checkout that fails over a configuration gap.
 */
export async function getShippingRates(client: Client): Promise<Record<ShippingOption, Money>> {
    const rows = await client.systemSetting.findMany({
        where: { key: { in: SHIPPING_OPTIONS.map(shippingRateKey) } },
        select: { key: true, value: true },
    })

    const stored = new Map(rows.map((r) => [r.key, r.value]))
    const rates = {} as Record<ShippingOption, Money>

    for (const option of SHIPPING_OPTIONS) {
        const raw = stored.get(shippingRateKey(option))
        // A stored value that does not parse falls back rather than producing NaN money.
        let value: Money
        try {
            value = raw !== undefined ? money(raw) : money(DEFAULT_SHIPPING_RATES[option])
        } catch {
            value = money(DEFAULT_SHIPPING_RATES[option])
        }
        rates[option] = value.isNegative() ? money(DEFAULT_SHIPPING_RATES[option]) : value
    }

    return rates
}
