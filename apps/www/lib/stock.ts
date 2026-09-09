export type StockStatus = "in" | "low" | "out"

export const LOW_STOCK_THRESHOLD = 5

export interface StockLevelLike {
    onHand: number
    reserved: number
}

export function availableOf(levels: readonly StockLevelLike[]): number {
    const total = levels.reduce((sum, level) => sum + level.onHand - level.reserved, 0)
    return Math.max(0, total)
}

export function stockStatusOf(available: number, threshold = LOW_STOCK_THRESHOLD): StockStatus {
    if (available <= 0) return "out"
    return available <= threshold ? "low" : "in"
}

export function stockStatusOfLevels(levels: readonly StockLevelLike[]): StockStatus {
    return stockStatusOf(availableOf(levels))
}
