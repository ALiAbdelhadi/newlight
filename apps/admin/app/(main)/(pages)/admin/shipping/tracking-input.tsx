"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setTrackingNumber } from "@/app/action/action"

/**
 * Entering a tracking number after the parcel has gone.
 *
 * It belongs here because this is where its absence is reported: the page counts "shipped,
 * untracked" and used to leave you with nowhere to act on the number. Under COD the number
 * arriving late is the normal case (F3), not an exception.
 */
export function TrackingInput({ orderId, current }: { orderId: string; current: string | null }) {
    const [value, setValue] = useState(current ?? "")
    const [pending, start] = useTransition()
    const router = useRouter()

    const dirty = value.trim() !== (current ?? "")

    const save = () =>
        start(async () => {
            const result = await setTrackingNumber(orderId, value)
            if (result.success) {
                toast.success(value.trim() ? "Tracking number saved." : "Tracking number cleared.")
                router.refresh()
            } else {
                toast.error(result.error ?? "Could not save that.")
            }
        })

    return (
        <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
                e.preventDefault()
                save()
            }}
        >
            <Input
                aria-label="Tracking number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="not entered"
                className="font-mono h-8 w-44"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={pending || !dirty}>
                {pending ? "…" : "Save"}
            </Button>
        </form>
    )
}
