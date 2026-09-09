import { ContactFormStatus, ContactPriority, Prisma, prisma } from "@repo/database"

import { requireCurrentAdmin } from "@/lib/auth"
import { toPrismaPage, type TableState } from "@/lib/table-params"

/**
 * Contact enquiries (P4.5 §11).
 *
 * The screen this serves used to be a client component that fetched `/api/contact-forms` on
 * mount, pulled fifty submissions WITH every response and every tag, and then filtered and
 * counted them in the browser. Three consequences, all of which this removes:
 *
 *   THE COUNTS WERE ABOUT THE PAGE. "Unread (3)" meant three unread in the fifty rows that had
 *   been fetched, not three unread. The badge in the sidebar counts the table, so the two
 *   disagreed, visibly, on the same screen.
 *
 *   THERE WAS A SPINNER WHERE THERE IS NO WAIT. A server component has the rows before it
 *   renders; the full-screen spinner existed only because the fetch did.
 *
 *   NOTHING WAS RECORDED. Marking read, changing status and DELETING a submission went
 *   straight to Prisma from a route handler with no audit row, so a deleted enquiry left no
 *   trace of who deleted it.
 *
 * `status` and `isRead` are two representations of one fact, which is a schema wart this
 * service papers over deliberately rather than migrating: reading a submission moves UNREAD to
 * READ and sets `isRead`, together, in one write. A later migration can drop the boolean.
 */

export const CONTACT_SORT_COLUMNS = ["createdAt", "fullName", "status", "priority"] as const
export type ContactSortColumn = (typeof CONTACT_SORT_COLUMNS)[number]

export interface ContactRow {
    id: string
    fullName: string
    jobPosition: string
    email: string
    phoneNumber: string
    message: string | null
    status: ContactFormStatus
    priority: ContactPriority
    isRead: boolean
    source: string
    responses: number
    createdAt: string
}

export interface ContactListResult {
    rows: ContactRow[]
    total: number
    unread: number
    /** Enquiries that arrived more than three days ago and nobody has opened. */
    stale: number
    urgent: number
}

function buildWhere(state: TableState): Prisma.ContactFormWhereInput {
    const { filters } = state
    const and: Prisma.ContactFormWhereInput[] = []

    const query = filters.q?.trim()
    if (query) {
        and.push({
            OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phoneNumber: { contains: query } },
                { jobPosition: { contains: query, mode: "insensitive" } },
                { message: { contains: query, mode: "insensitive" } },
            ],
        })
    }

    if (filters.status && filters.status in ContactFormStatus) {
        and.push({ status: filters.status as ContactFormStatus })
    }
    if (filters.priority && filters.priority in ContactPriority) {
        and.push({ priority: filters.priority as ContactPriority })
    }
    if (filters.read === "unread") and.push({ isRead: false })
    if (filters.read === "read") and.push({ isRead: true })

    return and.length > 0 ? { AND: and } : {}
}

function buildOrderBy(state: TableState): Prisma.ContactFormOrderByWithRelationInput[] {
    switch (state.sort as ContactSortColumn | null) {
        case "fullName":
            return [{ fullName: state.dir }]
        case "status":
            return [{ status: state.dir }, { createdAt: "desc" }]
        case "priority":
            return [{ priority: state.dir }, { createdAt: "desc" }]
        case "createdAt":
        default:
            return [{ createdAt: state.dir }]
    }
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export class ContactService {
    static async list(state: TableState): Promise<ContactListResult> {
        await requireCurrentAdmin()
        const where = buildWhere(state)

        const [total, unread, stale, urgent] = await Promise.all([
            prisma.contactForm.count({ where }),
            // The summary counts are over EVERYTHING, not over the filtered set: they are what
            // the operator filters BY, so narrowing the list must not change them.
            prisma.contactForm.count({ where: { isRead: false } }),
            prisma.contactForm.count({
                where: { isRead: false, createdAt: { lt: new Date(Date.now() - THREE_DAYS_MS) } },
            }),
            prisma.contactForm.count({
                where: { priority: ContactPriority.URGENT, status: { notIn: [ContactFormStatus.CLOSED, ContactFormStatus.SPAM] } },
            }),
        ])

        const { skip, take } = toPrismaPage(state, total)

        const forms = await prisma.contactForm.findMany({
            where,
            skip,
            take,
            orderBy: buildOrderBy(state),
            select: {
                id: true,
                fullName: true,
                jobPosition: true,
                email: true,
                phoneNumber: true,
                message: true,
                status: true,
                priority: true,
                isRead: true,
                source: true,
                createdAt: true,
                // A count, not the rows. The replies themselves are read when one is opened.
                _count: { select: { responses: true } },
            },
        })

        return {
            rows: forms.map((form) => ({
                id: form.id,
                fullName: form.fullName,
                jobPosition: form.jobPosition,
                email: form.email,
                phoneNumber: form.phoneNumber,
                message: form.message,
                status: form.status,
                priority: form.priority,
                isRead: form.isRead,
                source: form.source,
                responses: form._count.responses,
                createdAt: form.createdAt.toISOString(),
            })),
            total,
            unread,
            stale,
            urgent,
        }
    }
}
