import { cache } from "react"
import {
    compareMoney,
    getShippingRates,
    prisma,
    serializeMoney,
    SHIPPING_OPTIONS,
    type SerializedMoney,
    type ShippingOption,
} from "@repo/database"

export type ShippingRates = Record<ShippingOption, SerializedMoney>

export const shippingRates = cache(async (): Promise<ShippingRates> => {
    const rates = await getShippingRates(prisma)
    const out = {} as ShippingRates
    for (const option of SHIPPING_OPTIONS) {
        out[option] = serializeMoney(rates[option])
    }
    return out
})

export function cheapestShippingRate(rates: ShippingRates): SerializedMoney {
    return SHIPPING_OPTIONS.map((option) => rates[option]).reduce((lowest, rate) =>
        compareMoney(rate, lowest) < 0 ? rate : lowest
    )
}
