"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { archiveCategory, archiveSubCategory, restoreTaxonomy } from "@/app/action/taxonomy-actions"

/**
 * Archive and restore.
 *
 * No confirmation dialog, deliberately: archiving is reversible from this same row, and the
 * service refuses outright while anything still lives inside — so the destructive case cannot
 * be reached by clicking, and a dialog in front of a reversible action just trains people to
 * dismiss dialogs.
 */
export function ArchiveButtons({
    kind,
    id,
    archived,
}: {
    kind: "category" | "subCategory"
    id: string
    archived: boolean
}) {
    const [pending, start] = useTransition()
    const router = useRouter()

    const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
        start(async () => {
            const result = await fn()
            if (result.ok) {
                toast.success(result.message ?? "Done.")
                router.refresh()
            } else {
                toast.error(result.error ?? "Something went wrong.")
            }
        })

    if (archived) {
        return (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => restoreTaxonomy(kind, id))}>
                Restore
            </Button>
        )
    }

    return (
        <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => run(() => (kind === "category" ? archiveCategory(id) : archiveSubCategory(id)))}
        >
            Archive
        </Button>
    )
}
