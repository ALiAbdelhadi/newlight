"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmAction, type ActionImpact } from "@/components/confirm-action"
import { cn } from "@/lib/utils"

/**
 * THE workflow primitive (P4.5 §13).
 *
 * A guided, stateful, consequential operation: bulk repricing, stocktake, purchase receipt,
 * delivery confirmation, stock adjustment.
 *
 * THE PREVIEW STEP IS NOT OPTIONAL, and that is enforced by the types rather than by
 * convention. `commitSummary.affectedCount` is required, so a workflow physically cannot
 * reach its commit without having counted the rows it is about to change — which means it
 * cannot reach it without having run the query that produces that count. "Preview before
 * commit" stops being a UI habit somebody might skip and becomes a thing the compiler asks
 * for.
 *
 * This mirrors what `PricingService` already enforces on the server: `apply()` re-previews
 * internally and compares a token, so a stale preview is refused by the database layer even
 * if the UI were bypassed entirely. The workflow is the explanation of that rule, not the
 * rule itself — which is the right way round.
 */

export interface WorkflowStep {
    id: string
    title: string
    /** Blocks Next with a reason. Returning a string shows it; `true` means the step is done. */
    validate?: () => true | string
    content: React.ReactNode
}

interface WorkflowProps {
    steps: WorkflowStep[]
    /** What the commit will do. Required — see the header comment. */
    commitSummary: {
        title: string
        description: string
        impact: ActionImpact
        confirmLabel?: string
        /** Destructive commits demand the phrase; consequential ones state the impact. */
        typeToConfirm?: string
    }
    onCommit: () => void | Promise<void>
    /** Rendered instead of the steps once the operation has run. */
    result?: React.ReactNode
    /** Disables Next and the commit while the server is working. */
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
            {/*
             * An ordered list, not a row of divs. The steps ARE a sequence, `aria-current`
             * says which one is live, and a screen reader announces "step 3 of 5" from the
             * markup rather than from a label somebody remembered to write.
             */}
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
                {steps.map((entry, position) => {
                    const done = position < index
                    const current = position === index
                    return (
                        <li key={entry.id} className="flex items-center gap-1">
                            <button
                                type="button"
                                // Only backwards: skipping ahead would land on a step whose
                                // inputs the earlier ones have not produced yet.
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
                    /*
                     * Two explicit branches rather than a computed `severity` with a spread.
                     *
                     * ConfirmAction's props are a discriminated union, so TypeScript cannot
                     * check `typeToConfirm` against a severity it has to evaluate at runtime —
                     * it rejected the spread outright. That refusal is the union working: the
                     * whole reason for it is that "destructive" and "typed confirmation" must
                     * travel together, and a conditional spread is exactly how they come
                     * apart. Writing both branches costs six lines and keeps the guarantee.
                     */
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

/**
 * The result of a committed workflow.
 *
 * `aria-live="assertive"` because this is the outcome of a consequential operation the
 * operator triggered and is waiting on — polite would queue it behind whatever else the
 * page is announcing, and "did the 40 prices change or not" is not a question to leave open.
 */
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
