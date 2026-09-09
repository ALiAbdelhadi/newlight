import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PageBody, PageHeader } from "@/components/page"
import { EmptyState } from "@/components/states"

/**
 * A record that is not there (P4.5 §19).
 *
 * Reached by `notFound()` from a record page — an order id that has been deleted, a product
 * from a stale bookmark. Inside the shell, so the operator keeps their navigation, and it says
 * which of the two things happened rather than "404".
 */
export default function AdminNotFound() {
    return (
        <>
            <PageHeader title="Not found" />
            <PageBody>
                <div className="rounded-lg border bg-card">
                    <EmptyState
                        variant="no-data"
                        title="That record does not exist"
                        description="It may have been deleted, or the link may be from an older version of the system. Nothing was changed."
                        action={
                            <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                                <Link href="/admin/dashboard">Go to Overview</Link>
                            </Button>
                        }
                    />
                </div>
            </PageBody>
        </>
    )
}
