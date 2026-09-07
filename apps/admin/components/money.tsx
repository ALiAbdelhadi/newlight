import {
    compareMoney,
    currencyName,
    DEFAULT_CURRENCY,
    formatMoney,
    formatMoneyNumber,
    type SerializedMoney,
} from "@repo/database"

import { cn } from "@/lib/utils"

/**
 * THE money readout (P4.5 §15).
 *
 * Formatting goes through `formatMoney` in @repo/database — the admin does not own a second
 * opinion about how an amount looks. What this component owns is everything AROUND the
 * number: alignment, figure style, the sign, and what "no value" means.
 *
 * Two decisions are load-bearing.
 *
 * FIRST, the prop is `SerializedMoney` — a string — and never a `Decimal` or a `number`.
 * That is not pedantry. Prisma hands back a Decimal; React cannot serialize one across a
 * server/client boundary; and `/admin/orders` is throwing 47 console errors at this moment
 * for exactly that reason. A component typed on `MoneyInput` would accept the Decimal in a
 * server component and fail at runtime the day someone moved it into a client one. Typed on
 * a string, the call site has to write `serializeMoney(product.price)`, which is the rule
 * money.ts already states. A number is refused for the older reason: it is binary floating
 * point, and 0.1 + 0.2 is not 0.3.
 *
 * SECOND, `digits: "fixed"`. Always two decimals, so a column's decimal points line up and
 * the tabular figures actually buy something.
 */

interface MoneyProps extends Omit<React.ComponentProps<"span">, "children"> {
    /** Serialized on the server. `null` means "not recorded", which is not the same as zero. */
    value: SerializedMoney | null | undefined
    /**
     * What to render when the value is null.
     *
     * "Not recorded" by default, and deliberately not "0.00" or "—". `Product.averageCost`
     * is null for every product in the catalogue right now because no cost has been entered
     * yet; rendering that as 0.00 states a cost of zero, which would make every margin
     * report read 100%. A bare em-dash says nothing at all. This is a normal launch state
     * (§15), so it gets words.
     */
    fallback?: string
    currency?: string
    /** Colour a negative amount. On by default — a negative total is always worth seeing. */
    signed?: boolean
    /** Drop the currency, for a column whose header already says it. */
    bare?: boolean
}

export function Money({
    value,
    fallback = "Not recorded",
    currency = DEFAULT_CURRENCY,
    signed = true,
    bare = false,
    className,
    ...props
}: MoneyProps) {
    if (value === null || value === undefined) {
        return (
            <span
                data-slot="money"
                data-empty="true"
                className={cn("tabular-nums whitespace-nowrap text-muted-foreground", className)}
                {...props}
            >
                {fallback}
            </span>
        )
    }

    const negative = signed && compareMoney(value, "0") < 0
    const text = bare
        ? formatMoneyNumber(value, "en", { digits: "fixed" })
        : formatMoney(value, "en", currency, { digits: "fixed" })

    return (
        <span
            data-slot="money"
            /*
             * The visible text reads "EGP 1,234.56", which a screen reader spells out as
             * "E G P". Saying the currency in words is clearer, and safe here because this
             * is a readout with no interactive affordance — nothing for a voice-control
             * user to try to click by its visible name.
             */
            aria-label={`${formatMoneyNumber(value, "en", { digits: "fixed" })} ${currencyName(currency)}`}
            className={cn("tabular-nums whitespace-nowrap", negative && "text-danger", className)}
            {...props}
        >
            {text}
        </span>
    )
}

interface NumProps extends Omit<React.ComponentProps<"span">, "children"> {
    value: number | null | undefined
    /** "pcs", "kg", "W". Rendered muted so the figure stays the thing being read. */
    unit?: string
    fallback?: string
    /**
     * Colour zero as a danger state. Off by default: zero is usually just a number.
     * Stock columns turn it on, because nought on hand is a condition, not a quantity.
     */
    emphasizeZero?: boolean
}

/**
 * Non-monetary figures — quantities, counts, variances.
 *
 * Separate from Money on purpose. A quantity has no currency, no fixed scale and no rounding
 * rule; folding the two together is how a stock count picks up two decimal places.
 */
export function Num({
    value,
    unit,
    fallback = "—",
    emphasizeZero = false,
    className,
    ...props
}: NumProps) {
    if (value === null || value === undefined) {
        return (
            <span
                data-slot="num"
                data-empty="true"
                className={cn("tabular-nums whitespace-nowrap text-muted-foreground", className)}
                {...props}
            >
                {fallback}
            </span>
        )
    }

    return (
        <span
            data-slot="num"
            className={cn(
                "tabular-nums whitespace-nowrap",
                value < 0 && "text-danger",
                emphasizeZero && value === 0 && "text-danger",
                className
            )}
            {...props}
        >
            {new Intl.NumberFormat("en").format(value)}
            {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
        </span>
    )
}

/**
 * A right-aligned table cell for figures.
 *
 * Alignment is a property of the COLUMN, not of the number, so it lives here rather than
 * baked into Money — which also has to work inline in a sentence on a record page, where
 * right-aligning it would be wrong.
 */
export function NumericCell({ className, ...props }: React.ComponentProps<"td">) {
    return <td data-slot="numeric-cell" className={cn("text-right tabular-nums", className)} {...props} />
}
