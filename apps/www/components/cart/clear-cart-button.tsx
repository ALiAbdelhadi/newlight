"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { clearCart } from "@/actions/cart"
import { Button } from "@/components/ui/button"

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
