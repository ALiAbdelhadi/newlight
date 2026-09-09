import type { PrismaClient, Prisma } from "@prisma/client"
import { money, type Money, type SerializedMoney } from "./money"

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

export async function getShippingRates(client: Client): Promise<Record<ShippingOption, Money>> {
    const rows = await client.systemSetting.findMany({
        where: { key: { in: SHIPPING_OPTIONS.map(shippingRateKey) } },
        select: { key: true, value: true },
    })

    const stored = new Map(rows.map((r) => [r.key, r.value]))
    const rates = {} as Record<ShippingOption, Money>

    for (const option of SHIPPING_OPTIONS) {
        const raw = stored.get(shippingRateKey(option))
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
