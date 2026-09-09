"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { reportError } from "@/lib/report-error"

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportError(error, { boundary: "admin" })
    }, [error])

    return (
        <div className="min-h-[60vh] grid place-items-center px-6 py-24">
            <div className="max-w-md text-center">
                <h1 className="text-2xl font-semibold mb-2">This screen failed to load</h1>
                <p className="text-muted-foreground mb-8">
                    Nothing you were doing has been saved unless it said so. Retrying is safe.
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={reset}>Try again</Button>
                    <Button variant="secondary" asChild>
                        <Link href="/admin/dashboard">Back to dashboard</Link>
                    </Button>
                </div>

                {error.digest && (
                    <p className="text-xs text-muted-foreground mt-8">
                        Reference <span className="font-mono">{error.digest}</span> — this appears in the server log.
                    </p>
                )}
            </div>
        </div>
    )
}
