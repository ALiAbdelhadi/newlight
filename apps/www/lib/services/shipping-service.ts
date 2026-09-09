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

/**
 * What shipping actually costs, read from the one place that decides it.
 *
 * The storefront was quoting shipping from a `SHIPPING_OPTIONS` constant hardcoded inside
 * `components/confirm-form.tsx` — 50, 100, 200 — while the order was PRICED by
 * `order-service.ts` from `getShippingRates`, which reads the `shipping.rate.*` rows the panel's
 * rate editor writes. The two agreed only as long as nobody used the editor. The moment an
 * operator changed Standard to 120, the checkout showed 100 and the order charged 120, and
 * nothing in either app would have reported it.
 *
 * So this is not a new feature, it is the second reader of the same source. Every surface that
 * MENTIONS a shipping price now goes through here, and the order that CHARGES one still goes
 * through `getShippingRates` inside its own transaction — a price quoted a minute ago must not
 * be able to decide what a customer pays.
 *
 * `cache` is per-request: a page that quotes rates in two places reads them once.
 */
export type ShippingRates = Record<ShippingOption, SerializedMoney>

export const shippingRates = cache(async (): Promise<ShippingRates> => {
    const rates = await getShippingRates(prisma)
    const out = {} as ShippingRates
    for (const option of SHIPPING_OPTIONS) {
        // Money crosses to the client as a string (ADR 0001); `getShippingRates` returns Decimals.
        out[option] = serializeMoney(rates[option])
    }
    return out
})

/**
 * The cheapest option, for the "from X" a cart can honestly show.
 *
 * The cart cannot name a price, because the option is chosen at checkout and this shop has no
 * cart-wide order. It can name a FLOOR, which is the one shipping fact that is true whatever
 * the customer picks — and it beats "calculated at checkout", which tells a customer to guess.
 */
export function cheapestShippingRate(rates: ShippingRates): SerializedMoney {
    return SHIPPING_OPTIONS.map((option) => rates[option]).reduce((lowest, rate) =>
        compareMoney(rate, lowest) < 0 ? rate : lowest
    )
}
