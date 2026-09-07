"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { ShippingOption } from "@repo/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { setShippingRate } from "@/app/action/shipping-actions"

interface Rate {
    option: ShippingOption
    amount: string
    isDefault: boolean
}

const DESCRIPTIONS: Record<ShippingOption, string> = {
    BasicShipping: "The cheapest option offered at checkout.",
    StandardShipping: "The default a customer gets unless they change it.",
    ExpressShipping: "The fastest option offered at checkout.",
}

export function RateEditor({ rates }: { rates: Rate[] }) {
    const [values, setValues] = useState<Record<string, string>>(
        Object.fromEntries(rates.map((r) => [r.option, r.amount]))
    )
    const [pending, start] = useTransition()

    const save = (option: ShippingOption) =>
        start(async () => {
            const result = await setShippingRate(option, values[option] ?? "")
            if (result.ok) toast.success(result.message ?? "Saved.")
            else toast.error(result.error)
        })

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rates.map((rate) => {
                const changed = values[rate.option] !== rate.amount
                return (
                    <form
                        key={rate.option}
                        className="bg-card rounded-lg border p-4 shadow-sm space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault()
                            save(rate.option)
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-semibold">{rate.option.replace("Shipping", " shipping")}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{DESCRIPTIONS[rate.option]}</p>
                            </div>
                            {/* "never set" and "set to the same number" are the same amount and
                                different facts — the second survives a change to the defaults. */}
                            {rate.isDefault && <Badge variant="outline">default</Badge>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor={`rate-${rate.option}`}>Amount (EGP)</Label>
                            <Input
                                id={`rate-${rate.option}`}
                                inputMode="decimal"
                                value={values[rate.option] ?? ""}
                                onChange={(e) => setValues((v) => ({ ...v, [rate.option]: e.target.value }))}
                                className="tabular-nums"
                            />
                        </div>

                        <Button type="submit" size="sm" variant="secondary" disabled={pending || !changed} className="w-full">
                            {pending ? "Saving…" : changed ? "Save" : "Saved"}
                        </Button>
                    </form>
                )
            })}
        </div>
    )
}
