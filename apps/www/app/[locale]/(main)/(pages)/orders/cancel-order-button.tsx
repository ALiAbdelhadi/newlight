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
