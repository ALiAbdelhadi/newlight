import { formatMoney, type MoneyInput } from "@repo/database"

export function formatNumberWithConversion(amount: MoneyInput, locale: string): string {
    return formatMoney(amount, locale)
}

export { formatMoney }
