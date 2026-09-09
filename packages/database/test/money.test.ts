import { describe, expect, it } from "vitest"
import {
    addMoney,
    compareMoney,
    currencyName,
    formatMoney,
    formatMoneyNumber,
    isZeroMoney,
    money,
    MONEY_SCALE,
    multiplyMoney,
    parseMoney,
    roundMoney,
    serializeMoney,
    subtractMoney,
    sumMoney,
} from "../money"

describe("money", () => {
    it("adds ten tenths to exactly one, which floating point does not", () => {
        const tenths = Array.from({ length: 10 }, () => money("0.10"))
        expect(serializeMoney(sumMoney(tenths))).toBe("1.00")

        const asFloat = tenths.reduce((sum) => sum + 0.1, 0)
        expect(asFloat).not.toBe(1)
    })

    it("keeps a real catalog total exact", () => {
        const line = multiplyMoney(money("199.50"), 3)
        const total = addMoney(line, money("100.00"))
        expect(serializeMoney(total)).toBe("698.50")
    })

    it("rounds once, at the boundary, not between multiplications", () => {
        const unrounded = multiplyMoney(money("0.125"), 3)
        expect(serializeMoney(unrounded)).toBe("0.38")
        expect(serializeMoney(multiplyMoney(roundMoney(money("0.125")), 3))).toBe("0.39")
    })

    it("round-trips through the server/client boundary", () => {
        const original = money("13531.00")
        expect(serializeMoney(parseMoney(serializeMoney(original)))).toBe("13531.00")
    })

    it("refuses a non-finite amount rather than storing NaN", () => {
        expect(() => money(Number.NaN)).toThrow(TypeError)
        expect(() => money(Number.POSITIVE_INFINITY)).toThrow(TypeError)
    })

    it("refuses a fractional or negative quantity", () => {
        expect(() => multiplyMoney(money("10.00"), 1.5)).toThrow(RangeError)
        expect(() => multiplyMoney(money("10.00"), -1)).toThrow(RangeError)
    })

    it("compares and subtracts without leaking to float", () => {
        expect(compareMoney(money("0.30"), subtractMoney(money("0.50"), money("0.20")))).toBe(0)
        expect(isZeroMoney(subtractMoney(money("1.10"), money("1.10")))).toBe(true)
    })

    describe("locale formatting", () => {
        it("puts the symbol before the amount in English", () => {
            expect(formatMoney("165.00", "en")).toBe("EGP 165")
        })

        it("puts it after, in Arabic-Indic digits, in Arabic", () => {
            const formatted = formatMoney("165.00", "ar")
            expect(formatted.endsWith("ج.م")).toBe(true)
            expect(formatted).toMatch(/[٠-٩]/)
            expect(formatted).not.toMatch(/[0-9]/)
        })

        it("formats a Decimal directly, without a lossy conversion at the call site", () => {
            expect(formatMoney(money("13531.00"), "en")).toBe("EGP 13,531")
        })
    })

    describe("fixed-digit formatting, for table columns", () => {
        it("keeps trailing zeros so a column aligns", () => {
            expect(formatMoney("1200.00", "en", "EGP", { digits: "fixed" })).toBe("EGP 1,200.00")
            expect(formatMoney("1234.56", "en", "EGP", { digits: "fixed" })).toBe("EGP 1,234.56")
        })

        it("gives every amount the same number of fraction digits", () => {
            const rendered = ["1200.00", "1234.56", "0.00", "145.50"].map((v) =>
                formatMoney(v, "en", "EGP", { digits: "fixed" })
            )
            const fractionLengths = rendered.map((s) => s.split(".")[1]?.length ?? 0)
            expect(new Set(fractionLengths)).toEqual(new Set([MONEY_SCALE]))
        })

        it("leaves the storefront's default alone", () => {
            expect(formatMoney("165.00", "en")).toBe("EGP 165")
            expect(formatMoney("165.00", "en", "EGP", { digits: "auto" })).toBe("EGP 165")
        })

        it("shows both cents or neither — never one", () => {
            expect(formatMoney("359.20", "en")).toBe("EGP 359.20")
            expect(formatMoney("359.25", "en")).toBe("EGP 359.25")
            expect(formatMoney("360.00", "en")).toBe("EGP 360")
        })

        it("still uses Arabic-Indic digits when fixed", () => {
            const formatted = formatMoney("1200.00", "ar", "EGP", { digits: "fixed" })
            expect(formatted).toMatch(/[٠-٩]/)
            expect(formatted).not.toMatch(/[0-9]/)
            expect(formatted.endsWith("ج.م")).toBe(true)
        })

        it("formats the bare number without a currency, for CSV and spoken labels", () => {
            expect(formatMoneyNumber("1234.56", "en", { digits: "fixed" })).toBe("1,234.56")
            expect(formatMoneyNumber("1200.00", "en")).toBe("1,200")
        })

        it("names the currency for accessible labels, and falls back to the code", () => {
            expect(currencyName("EGP")).toBe("Egyptian pounds")
            expect(currencyName()).toBe("Egyptian pounds")
            expect(currencyName("USD")).toBe("USD")
        })

        it("rounds before padding, so a third decimal cannot survive", () => {
            expect(formatMoney("1.005", "en", "EGP", { digits: "fixed" })).toBe("EGP 1.01")
            expect(formatMoney("1.004", "en", "EGP", { digits: "fixed" })).toBe("EGP 1.00")
        })
    })
})
