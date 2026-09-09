import { Prisma } from "./generated/prisma/client"

const Decimal = Prisma.Decimal

export type Money = Prisma.Decimal

export type MoneyInput = Money | string | number

export type SerializedMoney = string

export const MONEY_SCALE = 2
export const DEFAULT_CURRENCY = "EGP"

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

export function roundMoney(value: MoneyInput): Money {
    return money(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
}

export function addMoney(...values: MoneyInput[]): Money {
    return values.reduce<Money>((total, value) => total.plus(money(value)), new Decimal(0))
}

export function subtractMoney(minuend: MoneyInput, subtrahend: MoneyInput): Money {
    return money(minuend).minus(money(subtrahend))
}

export function multiplyMoney(amount: MoneyInput, quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
        throw new RangeError(`multiplyMoney(): quantity must be a non-negative integer, got ${quantity}`)
    }
    return money(amount).times(quantity)
}

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

export function serializeMoney(value: MoneyInput): SerializedMoney {
    return roundMoney(value).toFixed(MONEY_SCALE)
}

export function parseMoney(value: SerializedMoney): Money {
    return money(value)
}

export function serializeMoneyOrNull(value: MoneyInput | null | undefined): SerializedMoney | null {
    return value === null || value === undefined ? null : serializeMoney(value)
}

const CURRENCY_DISPLAY: Record<string, { symbol: string; after: boolean; arabicDigits: boolean }> = {
    ar: { symbol: "ج.م", after: true, arabicDigits: true },
    en: { symbol: "EGP", after: false, arabicDigits: false },
}

const CURRENCY_NAME: Record<string, string> = {
    EGP: "Egyptian pounds",
}

export function currencyName(currency: string = DEFAULT_CURRENCY): string {
    return CURRENCY_NAME[currency] ?? currency
}

export interface FormatMoneyOptions {
    digits?: "auto" | "fixed"
}

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

export function formatMoneyNumber(
    value: MoneyInput,
    locale: string,
    options: FormatMoneyOptions = {}
): string {
    const base = locale.split("-")[0] ?? "en"
    const display = CURRENCY_DISPLAY[base] ?? CURRENCY_DISPLAY.en!
    const rounded = roundMoney(value)
    const withCents = options.digits === "fixed" || !rounded.isInteger()

    return new Intl.NumberFormat(display.arabicDigits ? `${base}-EG-u-nu-arab` : locale, {
        minimumFractionDigits: withCents ? MONEY_SCALE : 0,
        maximumFractionDigits: MONEY_SCALE,
    }).format(rounded.toNumber())
}
