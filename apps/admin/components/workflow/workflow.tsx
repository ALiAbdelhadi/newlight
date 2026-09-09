"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmAction, type ActionImpact } from "@/components/confirm-action"
import { cn } from "@/lib/utils"

export interface WorkflowStep {
    id: string
    title: string
    validate?: () => true | string
    content: React.ReactNode
}

interface WorkflowProps {
    steps: WorkflowStep[]
    commitSummary: {
        title: string
        description: string
        impact: ActionImpact
        confirmLabel?: string
        typeToConfirm?: string
    }
    onCommit: () => void | Promise<void>
    result?: React.ReactNode
    busy?: boolean
}

export function Workflow({ steps, commitSummary, onCommit, result, busy = false }: WorkflowProps) {
    const [index, setIndex] = useState(0)
    const [blocked, setBlocked] = useState<string | null>(null)

    if (result) return <div className="max-w-[860px]">{result}</div>

    const step = steps[index]!
    const isLast = index === steps.length - 1

    function goNext() {
        const verdict = step.validate?.() ?? true
        if (verdict !== true) {
            setBlocked(verdict)
            return
        }
        setBlocked(null)
        setIndex((current) => Math.min(current + 1, steps.length - 1))
    }

    function goBack() {
        setBlocked(null)
        setIndex((current) => Math.max(current - 1, 0))
    }

    return (
        <div className="max-w-[860px] space-y-4">
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
                {steps.map((entry, position) => {
                    const done = position < index
                    const current = position === index
                    return (
                        <li key={entry.id} className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={position > index}
                                onClick={() => position < index && setIndex(position)}
                                aria-current={current ? "step" : undefined}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-(--duration-fast)",
                                    current && "bg-accent font-medium text-foreground",
                                    done && "text-muted-foreground hover:bg-accent/60",
                                    !current && !done && "cursor-default text-muted-foreground"
                                )}
                            >
                                <span
                                    className={cn(
                                        "grid size-4 shrink-0 place-items-center rounded-full text-2xs tabular-nums",
                                        done && "bg-success text-background",
                                        current && "bg-primary text-primary-foreground",
                                        !done && !current && "border"
                                    )}
                                >
                                    {done ? <Check aria-hidden className="size-2.5" /> : position + 1}
                                </span>
                                {entry.title}
                            </button>
                            {position < steps.length - 1 && (
                                <ChevronRight aria-hidden className="size-3 text-muted-foreground" />
                            )}
                        </li>
                    )
                })}
            </ol>

            <div className="rounded-lg border border-border-strong bg-card">
                <div className="border-b px-3 py-2">
                    <h2 className="text-sm font-medium">
                        {index + 1}. {step.title}
                    </h2>
                </div>
                <div className="p-3">{step.content}</div>
            </div>

            {blocked && (
                <p role="alert" className="text-xs text-danger">
                    {blocked}
                </p>
            )}

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goBack}
                    disabled={index === 0 || busy}
                    className="h-8 text-xs"
                >
                    <ChevronLeft aria-hidden className="mr-1 size-3.5" />
                    Back
                </Button>

                {isLast ? (
                    commitSummary.typeToConfirm ? (
                        <ConfirmAction
                            severity="destructive"
                            title={commitSummary.title}
                            description={commitSummary.description}
                            confirmLabel={commitSummary.confirmLabel ?? "Commit"}
                            impact={commitSummary.impact}
                            typeToConfirm={commitSummary.typeToConfirm}
                            onConfirm={onCommit}
                        >
                            <Button size="sm" disabled={busy} className="h-8 text-xs">
                                {busy ? "Working…" : (commitSummary.confirmLabel ?? "Commit")}
                            </Button>
                        </ConfirmAction>
                    ) : (
                        <ConfirmAction
                            severity="consequential"
                            title={commitSummary.title}
                            description={commitSummary.description}
                            confirmLabel={commitSummary.confirmLabel ?? "Commit"}
                            impact={commitSummary.impact}
                            onConfirm={onCommit}
                        >
                            <Button size="sm" disabled={busy} className="h-8 text-xs">
                                {busy ? "Working…" : (commitSummary.confirmLabel ?? "Commit")}
                            </Button>
                        </ConfirmAction>
                    )
                ) : (
                    <Button size="sm" onClick={goNext} disabled={busy} className="h-8 text-xs">
                        Next
                        <ChevronRight aria-hidden className="ml-1 size-3.5" />
                    </Button>
                )}

                <span className="ml-auto text-2xs tabular-nums text-muted-foreground">
                    Step {index + 1} of {steps.length}
                </span>
            </div>
        </div>
    )
}

export function WorkflowResult({
    title,
    children,
    actions,
}: {
    title: string
    children?: React.ReactNode
    actions?: React.ReactNode
}) {
    return (
        <div
            role="status"
            aria-live="assertive"
            className="rounded-lg border border-success-border bg-success-bg p-4"
        >
            <h2 className="flex items-center gap-2 text-sm font-medium text-success">
                <Check aria-hidden className="size-4" />
                {title}
            </h2>
            {children && <div className="mt-2 text-xs">{children}</div>}
            {actions && <div className="mt-3 flex gap-2">{actions}</div>}
        </div>
    )
}
