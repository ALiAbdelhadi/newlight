import { requireCurrentAdmin } from "@/lib/auth"
import { ContactService } from "@/lib/services/contact-service"
import { parseTableState } from "@/lib/table-params"
import { InlineAlert, PageBody, PageHeader, PageStack, Stat, StatGrid } from "@/components/page"
import { ContactTable } from "./contact-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Contact enquiries (P4.5 §11, §19).
 *
 * A server component. The screen this replaces was a client component that fetched
 * `/api/contact-forms` on mount behind a full-screen spinner, then filtered and counted the
 * result in the browser — so "Unread (3)" described the fifty rows that had been fetched
 * rather than the table, and disagreed with the sidebar badge on the same screen.
 *
 * The summary above the list is deliberately short and every figure in it is actionable: how
 * many are unread, how many have been sitting unopened for more than three days, how many are
 * marked urgent. A count of "total enquiries ever received" would be a number nobody can do
 * anything about, which is what §9 means by a decorative KPI.
 */
export default async function ContactPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    await requireCurrentAdmin()

    const state = parseTableState(await searchParams, { sort: "createdAt", dir: "desc" })
    const result = await ContactService.list(state)

    return (
        <>
            <PageHeader
                title="Contact enquiries"
                description="Submissions from the storefront's contact form. Opening one marks it read; the person who read it and when is recorded."
            />

            <PageBody className="pb-0">
                <PageStack className="gap-3">
                    {result.stale > 0 && (
                        <InlineAlert
                            tone="warning"
                            title={`${result.stale} enquir${result.stale === 1 ? "y has" : "ies have"} waited more than three days`}
                        >
                            Nobody has opened them. Sort by Received, oldest first, to work through the backlog.
                        </InlineAlert>
                    )}

                    <StatGrid className="md:grid-cols-3">
                        <Stat
                            label="Unread"
                            value={result.unread}
                            hint={result.unread > 0 ? "waiting to be opened" : "queue is clear"}
                            tone={result.unread > 0 ? "warning" : "success"}
                        />
                        <Stat
                            label="Unopened over 3 days"
                            value={result.stale}
                            tone={result.stale > 0 ? "danger" : "default"}
                        />
                        <Stat
                            label="Marked urgent"
                            value={result.urgent}
                            hint="open enquiries only"
                            tone={result.urgent > 0 ? "danger" : "default"}
                        />
                    </StatGrid>
                </PageStack>
            </PageBody>

            <ContactTable {...result} state={state} />
        </>
    )
}
