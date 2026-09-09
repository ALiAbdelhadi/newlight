import { PageBody } from "@/components/page"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
    return (
        <>
            <div className="shrink-0 border-b bg-card px-4 pt-3 pb-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-1.5 h-3 w-80" />
            </div>

            <PageBody>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-[30px] w-56" />
                    <Skeleton className="h-[30px] w-40" />
                    <Skeleton className="ml-auto h-[30px] w-24" />
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border">
                    <div className="h-8 border-b border-border-strong bg-surface-sunk" />
                    <ul>
                        {Array.from({ length: 12 }).map((_, index) => (
                            <li
                                key={index}
                                aria-hidden
                                className="flex h-[34px] items-center gap-3 border-b px-2.5 last:border-b-0"
                            >
                                <span className="h-2.5 w-[22%] rounded-sm bg-muted" />
                                <span className="h-2.5 w-[16%] rounded-sm bg-muted" />
                                <span className="h-2.5 w-[12%] rounded-sm bg-muted" />
                                <span className="ml-auto h-2.5 w-[8%] rounded-sm bg-muted" />
                            </li>
                        ))}
                    </ul>
                </div>
            </PageBody>

            <span role="status" aria-live="polite" className="sr-only">
                Loading…
            </span>
        </>
    )
}
