import { cache } from "react"
import { loadActiveDiscounts, prisma, type ActiveDiscount } from "@repo/database"

export const activeDiscounts = cache(async (): Promise<ActiveDiscount[]> => {
    try {
        return await loadActiveDiscounts(prisma, new Date())
    } catch (error) {
        console.error("[discounts] falling back to base prices:", error)
        return []
    }
})
