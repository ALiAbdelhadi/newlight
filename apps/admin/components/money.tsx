import {
    compareMoney,
    currencyName,
    DEFAULT_CURRENCY,
    formatMoney,
    formatMoneyNumber,
    type SerializedMoney,
} from "@repo/database"

import { cn } from "@/lib/utils"

interface MoneyProps extends Omit<React.ComponentProps<"span">, "children"> {
    value: SerializedMoney | null | undefined
    fallback?: string
    currency?: string
    signed?: boolean
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
    unit?: string
    fallback?: string
    emphasizeZero?: boolean
}

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

export function NumericCell({ className, ...props }: React.ComponentProps<"td">) {
    return <td data-slot="numeric-cell" className={cn("text-right tabular-nums", className)} {...props} />
}
