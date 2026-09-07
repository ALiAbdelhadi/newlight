/**
 * Re-export only. The implementation lives in @repo/database/money (§4), because the admin
 * app formats the same amounts and had its own `formatPrice` hardcoded to `en-US`.
 *
 * The name is kept so the existing call sites do not churn; `amount` widened from `number`
 * to MoneyInput, which is what lets a Decimal reach a screen without a lossy conversion.
 */
import { formatMoney, type MoneyInput } from "@repo/database"

export function formatNumberWithConversion(amount: MoneyInput, locale: string): string {
    return formatMoney(amount, locale)
}

export { formatMoney }
