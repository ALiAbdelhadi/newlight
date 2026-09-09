"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { clearCart } from "@/actions/cart"
import { Button } from "@/components/ui/button"

/**
 * Empties the cart, after a confirmation.
 *
 * `window.confirm` rather than a dialog: this is one destructive action with one sentence of
 * consequence, and the native prompt is keyboard-accessible, focus-safe and translated by the
 * caller. The drawer's per-row remove has no confirmation because a row is cheap to re-add;
 * six rows are not.
 */
export function ClearCartButton({ label, confirm }: { label: string; confirm: string }) {
    const [pending, startTransition] = useTransition()

    return (
        <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
                if (!window.confirm(confirm)) return
                startTransition(async () => {
                    const result = await clearCart()
                    if (!result.success) toast.error(result.error ?? label)
                })
            }}
        >
            {label}
        </Button>
    )
}
