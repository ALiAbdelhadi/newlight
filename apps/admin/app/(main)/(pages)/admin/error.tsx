"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PageBody, PageHeader, InlineAlert } from "@/components/page"
import { reportError } from "@/lib/report-error"

export default function AdminSurfaceError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        reportError(error, { boundary: "admin-surface" })
    }, [error])

    return (
        <>
            <PageHeader title="This screen failed to load" />

            <PageBody>
                <InlineAlert
                    tone="danger"
                    title="Something went wrong loading this surface"
                    action={
                        <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" onClick={reset} className="h-7 text-xs">
                                Try again
                            </Button>
                            <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                                <Link href="/admin/dashboard">Go to Overview</Link>
                            </Button>
                        </div>
                    }
                >
                    Nothing you were doing has been saved unless it said so, and retrying is safe — this screen
                    only reads.
                    {error.digest && (
                        <>
                            {" "}
                            Quote <span className="font-mono text-foreground">{error.digest}</span> when reporting
                            it; the same reference is in the server log.
                        </>
                    )}
                </InlineAlert>
            </PageBody>
        </>
    )
}
