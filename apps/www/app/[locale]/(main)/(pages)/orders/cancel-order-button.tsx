"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogAction,
    DialogCancel,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { requestOrderCancellation } from "@/actions/order"

interface Labels {
    cancel: string
    cancelling: string
    title: string
    body: string
    confirm: string
    keep: string
    done: string
    failed: string
}

/**
 * A customer cancelling their own order.
 *
 * `requestOrderCancellation` has existed since P3b and nothing called it: the machinery to let
 * a customer cancel was complete, and there was no button. It goes through the order state
 * machine with `actor: CUSTOMER`, so the same rules that stop an admin from cancelling a
 * shipped order stop this too — the button being drawn is a hint, not the check.
 *
 * The strings are passed in because this is a client component inside a server-rendered list;
 * `useTranslations` here would ship the whole message catalogue to do what the parent already
 * did on the server.
 */
export function CancelOrderButton({
    orderId,
    labels,
}: {
    orderId: string
    orderNumber: string
    labels: Labels
}) {
    const [pending, start] = useTransition()
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const cancel = () =>
        start(async () => {
            const result = await requestOrderCancellation(orderId)
            if (result.success) {
                toast.success(labels.done)
                setOpen(false)
                router.refresh()
            } else {
                // The reason comes from the state machine — "cannot go from shipped to
                // cancelled" is more use than a generic failure.
                toast.error(result.error ?? labels.failed)
            }
        })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={pending}>
                    {pending ? labels.cancelling : labels.cancel}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{labels.title}</DialogTitle>
                    <DialogDescription>{labels.body}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogCancel disabled={pending}>{labels.keep}</DialogCancel>
                    <DialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(event: React.MouseEvent) => {
                            event.preventDefault()
                            cancel()
                        }}
                    >
                        {labels.confirm}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
