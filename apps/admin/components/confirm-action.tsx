"use client"

import { useState } from "react"
import { AlertTriangle, OctagonAlert } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Money } from "@/components/money"
import { cn } from "@/lib/utils"
import type { SerializedMoney } from "@repo/database"

/**
 * THE confirmation (P4.5 §18).
 *
 * Three severities, and the difference between them is enforced by the TYPES, not by whoever
 * writes the call site remembering to be careful:
 *
 *   reversible    — one sentence, one button. Archiving, hiding, unpublishing.
 *   consequential — MUST pass `impact`. The compiler refuses the call without it.
 *   destructive   — MUST pass `typeToConfirm`. The compiler refuses that one too.
 *
 * That is the whole point of the component. "Are you sure?" is not a safety mechanism; it is
 * a thing people click. What actually prevents a mistake is stating the count, the money and
 * the side effects, and a discriminated union is the only way to make stating them
 * unavoidable.
 *
 * Delivery confirmation is `consequential`, not `reversible` — it settles payment and moves
 * stock, and neither of those comes back on its own.
 */

interface BaseProps {
    title: string
    description: string
    confirmLabel?: string
    onConfirm: () => void | Promise<void>
    children: React.ReactNode
    /**
     * Why the action cannot proceed, with the counts that explain it. When present the
     * confirm button is disabled and the dialog explains rather than refusing silently —
     * which is what the services already do (`taxonomy-service` names how many products sit
     * inside a sub-category before it refuses to archive it).
     */
    blockedBy?: { reason: string; counts?: { label: string; count: number }[] }
}

export interface ActionImpact {
    /** How many rows change. Required, because "this will affect some products" is not a fact. */
    affectedCount: number
    /** The money that moves, where money moves. */
    financialImpact?: SerializedMoney
    /** Everything else that happens and would surprise someone. */
    sideEffects: string[]
}

type ConfirmActionProps =
    | (BaseProps & { severity: "reversible"; impact?: never; typeToConfirm?: never })
    | (BaseProps & { severity: "consequential"; impact: ActionImpact; typeToConfirm?: never })
    | (BaseProps & { severity: "destructive"; impact?: ActionImpact; typeToConfirm: string })

export function ConfirmAction({
    severity,
    title,
    description,
    confirmLabel,
    onConfirm,
    children,
    blockedBy,
    impact,
    typeToConfirm,
}: ConfirmActionProps) {
    const [open, setOpen] = useState(false)
    const [typed, setTyped] = useState("")
    const [pending, setPending] = useState(false)

    const blocked = !!blockedBy
    const typedOk = severity !== "destructive" || typed.trim() === typeToConfirm
    const canConfirm = !blocked && typedOk && !pending

    async function run() {
        setPending(true)
        try {
            await onConfirm()
            setOpen(false)
            setTyped("")
        } finally {
            setPending(false)
        }
    }

    return (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setTyped("")
            }}
        >
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-base">
                        {severity === "destructive" && (
                            <OctagonAlert aria-hidden className="size-4 shrink-0 text-danger" />
                        )}
                        {severity === "consequential" && (
                            <AlertTriangle aria-hidden className="size-4 shrink-0 text-warning" />
                        )}
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">{description}</AlertDialogDescription>
                </AlertDialogHeader>

                {impact && (
                    <div className="rounded-md border border-border-strong bg-surface-sunk p-3 text-xs">
                        <dl className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-muted-foreground">Records affected</dt>
                                <dd className="font-medium tabular-nums">{impact.affectedCount}</dd>
                            </div>
                            {impact.financialImpact !== undefined && (
                                <div className="flex items-baseline justify-between gap-4">
                                    <dt className="text-muted-foreground">Financial impact</dt>
                                    <dd className="font-medium">
                                        <Money value={impact.financialImpact} />
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {impact.sideEffects.length > 0 && (
                            <ul className="mt-2 space-y-1 border-t pt-2 text-muted-foreground">
                                {impact.sideEffects.map((effect) => (
                                    <li key={effect} className="flex gap-1.5">
                                        <span aria-hidden>·</span>
                                        {effect}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {blockedBy && (
                    <div className="rounded-md border border-danger-border bg-danger-bg p-3 text-xs text-danger">
                        <p className="font-medium">{blockedBy.reason}</p>
                        {blockedBy.counts && blockedBy.counts.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                                {blockedBy.counts.map((entry) => (
                                    <li key={entry.label} className="flex justify-between gap-4">
                                        <span>{entry.label}</span>
                                        <span className="tabular-nums">{entry.count}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {severity === "destructive" && !blocked && (
                    <div className="space-y-1">
                        <label htmlFor="confirm-phrase" className="block text-xs text-muted-foreground">
                            Type <span className="font-mono text-foreground">{typeToConfirm}</span> to confirm
                        </label>
                        <Input
                            id="confirm-phrase"
                            value={typed}
                            onChange={(event) => setTyped(event.target.value)}
                            autoComplete="off"
                            className="font-mono"
                        />
                    </div>
                )}

                <AlertDialogFooter>
                    {/*
                     * Cancel comes first in the DOM, so it takes initial focus in a
                     * destructive dialog. Someone dismissing a dialog with the keyboard
                     * should not have the delete button under the space bar.
                     */}
                    <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!canConfirm}
                        onClick={(event) => {
                            event.preventDefault()
                            void run()
                        }}
                        className={cn(
                            "h-8 text-xs",
                            severity === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        )}
                    >
                        {pending ? "Working…" : (confirmLabel ?? "Confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
