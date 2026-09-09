import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PageBody, PageHeader } from "@/components/page"
import { EmptyState } from "@/components/states"

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
