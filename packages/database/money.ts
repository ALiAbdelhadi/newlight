/**
 * Money.
 *
 * v1 stored every monetary value as `double precision` and did its arithmetic in JavaScript
 * `number`. Both are binary floating point, which cannot represent 0.10, so a cart of ten
 * 0.10 items was not 1.00. Migration 0001 moved the columns to DECIMAL(12,2); this module is
 * the reason that holds, because Prisma hands back a Decimal and the first `Number(price)`
 * anywhere in the codebase silently undoes the migration.
 *
 * Rules this module exists to enforce:
 *   1. Money is never a `number`. Not in a total, not in a subtotal, not "just for display".
 *   2. Rounding happens once, at the end, never between multiplications.
 *   3. A Decimal cannot cross the server/client boundary — React cannot serialize it — so it
 *      crosses as a string, through serializeMoney, and is re-read through parseMoney.
 */
import { Prisma } from "@prisma/client"

const Decimal = Prisma.Decimal

/** A monetary amount. Always a Decimal, never a number. */
export type Money = Prisma.Decimal

/** Anything that can be read as money without losing precision on the way in. */
export type MoneyInput = Money | string | number

/** Money on the wire: the string form that survives the server/client boundary. */
export type SerializedMoney = string

export const MONEY_SCALE = 2
export const DEFAULT_CURRENCY = "EGP"

/**
 * A `number` is accepted because Prisma's own inputs and existing JSON allow it, and
 * Decimal parses it through its shortest decimal representation, so 0.1 arrives as 0.1
 * rather than 0.1000000000000000055. It is still the wrong type to compute in: use it to
 * enter the domain, then stay in Money.
 */
export function money(value: MoneyInput): Money {
    const decimal = value instanceof Decimal ? value : new Decimal(value)
    if (!decimal.isFinite()) {
        throw new TypeError(`money(): ${String(value)} is not a finite amount`)
    }
    return decimal
}

export function isMoney(value: unknown): value is Money {
    return value instanceof Decimal
}

/** Round to the stored scale, half away from zero — the rounding a customer expects. */
export function roundMoney(value: MoneyInput): Money {
    return money(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
}

export function addMoney(...values: MoneyInput[]): Money {
    return values.reduce<Money>((total, value) => total.plus(money(value)), new Decimal(0))
}

export function subtractMoney(minuend: MoneyInput, subtrahend: MoneyInput): Money {
    return money(minuend).minus(money(subtrahend))
}

/**
 * Deliberately unrounded. A line total that is rounded here and rounded again inside an
 * order total rounds twice; callers round once, at the point the number is stored or shown.
 */
export function multiplyMoney(amount: MoneyInput, quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
        throw new RangeError(`multiplyMoney(): quantity must be a non-negative integer, got ${quantity}`)
    }
    return money(amount).times(quantity)
}

/**
 * Divide, for apportioning a shipping charge across order lines.
 *
 * Deliberately unrounded, like multiplyMoney: rounding each share to cents and summing them
 * does not add back to the original — the classic penny-splitting error. Round once, where the
 * value is stored or shown.
 */
export function divideMoney(amount: MoneyInput, divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
        throw new RangeError(`divideMoney(): divisor must be a non-zero finite number, got ${divisor}`)
    }
    return money(amount).dividedBy(divisor)
}

export function sumMoney(values: Iterable<MoneyInput>): Money {
    let total: Money = new Decimal(0)
    for (const value of values) total = total.plus(money(value))
    return total
}

export function compareMoney(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
    return money(a).comparedTo(money(b)) as -1 | 0 | 1
}

export function isZeroMoney(value: MoneyInput): boolean {
    return money(value).isZero()
}

export function isNegativeMoney(value: MoneyInput): boolean {
    return money(value).isNegative()
}

/**
 * Server -> client. Next.js cannot pass a Decimal through a server component boundary; it
 * arrives as a plain object with no methods, and `Number(...)` on it is how the precision
 * gets lost again. The string form is exact and re-enters the domain through parseMoney.
 */
export function serializeMoney(value: MoneyInput): SerializedMoney {
    return roundMoney(value).toFixed(MONEY_SCALE)
}

export function parseMoney(value: SerializedMoney): Money {
    return money(value)
}

/** Optional variants, so a nullable column does not need a ternary at every call site. */
export function serializeMoneyOrNull(value: MoneyInput | null | undefined): SerializedMoney | null {
    return value === null || value === undefined ? null : serializeMoney(value)
}

/** Currency presentation, per locale. Arabic writes the symbol after the number. */
const CURRENCY_DISPLAY: Record<string, { symbol: string; after: boolean; arabicDigits: boolean }> = {
    ar: { symbol: "ج.م", after: true, arabicDigits: true },
    en: { symbol: "EGP", after: false, arabicDigits: false },
}

/** Spoken currency names, for accessible labels. Falls back to the code, which reads fine. */
const CURRENCY_NAME: Record<string, string> = {
    EGP: "Egyptian pounds",
}

export function currencyName(currency: string = DEFAULT_CURRENCY): string {
    return CURRENCY_NAME[currency] ?? currency
}

export interface FormatMoneyOptions {
    /**
     * How many fraction digits to show.
     *
     * `"auto"` (the default) drops a trailing `.00`, which is right for a storefront: a
     * price tag reading "EGP 165" is how the number is written on a shelf.
     *
     * `"fixed"` always shows MONEY_SCALE digits. That is a TABLE requirement, not a taste:
     * a column alternating "EGP 1,200" and "EGP 1,234.56" has its decimal points in
     * different places, and an operator scanning two hundred rows for an anomaly is reading
     * the shape of the column, not each number. Tabular figures only align if every cell
     * has the same number of them.
     */
    digits?: "auto" | "fixed"
}

/**
 * THE price formatter, for both apps.
 *
 * Before this there were three: ~10 inline `Intl.NumberFormat` calls in the storefront, one
 * `formatNumberWithConversion` used by a single file, and an admin `formatPrice` hardcoded to
 * `en-US` — so the same order total rendered differently depending on which screen you were
 * looking at. §4 folds them into one.
 *
 * It takes MoneyInput, not `number`. That is the point: a formatter typed on `number` is an
 * invitation to call `Number(price)` on a Decimal at every call site, which undoes migration
 * 0001 one screen at a time.
 *
 * Arabic gets Arabic-Indic digits and the symbol after the amount, which is how prices are
 * written in Egypt — not a transliteration of the English layout.
 */
export function formatMoney(
    value: MoneyInput,
    locale: string,
    currency: string = DEFAULT_CURRENCY,
    options: FormatMoneyOptions = {}
): string {
    const base = locale.split("-")[0] ?? "en"
    const display = CURRENCY_DISPLAY[base] ?? CURRENCY_DISPLAY.en!
    const symbol = currency === DEFAULT_CURRENCY ? display.symbol : currency

    return display.after
        ? `${formatMoneyNumber(value, locale, options)} ${symbol}`
        : `${symbol} ${formatMoneyNumber(value, locale, options)}`
}

/**
 * The number alone, without the currency.
 *
 * Exported for the two places a bare amount is correct: an accessible label that spells the
 * currency out in words, and a CSV cell, where "EGP" in every row of a column headed "Price"
 * is noise that also stops the column being summed by whatever opens the file.
 */
export function formatMoneyNumber(
    value: MoneyInput,
    locale: string,
    options: FormatMoneyOptions = {}
): string {
    const base = locale.split("-")[0] ?? "en"
    const display = CURRENCY_DISPLAY[base] ?? CURRENCY_DISPLAY.en!
    const fixed = options.digits === "fixed"

    return new Intl.NumberFormat(display.arabicDigits ? `${base}-EG-u-nu-arab` : locale, {
        minimumFractionDigits: fixed ? MONEY_SCALE : 0,
        maximumFractionDigits: MONEY_SCALE,
    }).format(roundMoney(value).toNumber())
}
