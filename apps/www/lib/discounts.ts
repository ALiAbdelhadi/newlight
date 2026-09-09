import { cache } from "react"
import { loadActiveDiscounts, prisma, type ActiveDiscount } from "@repo/database"

/**
 * The live discount set, once per request.
 *
 * `loadActiveDiscounts` is one query for the whole set rather than a lookup per product, and
 * React's `cache` makes it one query per REQUEST rather than one per service call — a category
 * page resolves prices for its tiles, its variant strips and its cart badge, and all three ask
 * for the same handful of rows.
 *
 * `new Date()` is captured here, not inside the resolver, so every price on one page is
 * resolved against the same instant. A page rendered across the second a discount expires must
 * not show two of its tiles on sale and two not.
 */
export const activeDiscounts = cache(async (): Promise<ActiveDiscount[]> => {
    try {
        return await loadActiveDiscounts(prisma, new Date())
    } catch (error) {
        /*
         * A storefront that cannot read the discount table must still sell at the base price.
         * The failure is loud in the log and invisible to the customer, which is the right way
         * round: showing 1000 when a sale says 850 is a bad day, and a 500 on every product
         * page is a worse one.
         */
        console.error("[discounts] falling back to base prices:", error)
        return []
    }
})
