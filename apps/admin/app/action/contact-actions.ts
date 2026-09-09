"use server"

import { revalidatePath } from "next/cache"
import { ContactFormStatus, ContactPriority, prisma } from "@repo/database"

import { ForbiddenError, requireCurrentAdmin, UnauthenticatedError } from "@/lib/auth"
import type { ActionResult } from "@/app/action/catalog-actions"

/**
 * Contact enquiry actions (P4.5 §18, §21).
 *
 * These replace three route handlers the admin called with `fetch` from a client component.
 * Server actions rather than API routes, per the repository's own convention: the operation is
 * app-internal, and the route handler bought nothing except a JSON round trip and a second
 * place for the authorization check to be forgotten.
 *
 * Every one of them writes an audit row. The route handlers wrote none — so a deleted enquiry
 * left no record that it had ever existed, let alone of who removed it.
 *
 * `status` and `isRead` are moved TOGETHER. They are two representations of the same fact and
 * the old PATCH could set either alone, which is how a submission ended up UNREAD with
 * `isRead: true` — invisible to the sidebar badge and present in the unread filter.
 */

function describe(error: unknown): string {
    if (error instanceof UnauthenticatedError) return "You are signed out. Sign in again."
    if (error instanceof ForbiddenError) return "Your role does not allow this."
    console.error("[contact-action]", error)
    return error instanceof Error ? error.message : "Something went wrong."
}

async function run(fn: () => Promise<string>): Promise<ActionResult> {
    try {
        const message = await fn()
        revalidatePath("/admin/contact")
        /*
         * The sidebar's unread badge comes from `getDashboardStats`, which is an
         * `unstable_cache` with a 60-second window — so the badge trails a mark-as-read by up
         * to a minute and then corrects itself. `revalidateTag` is deliberately not called:
         * in Next 16 it requires a cache profile, and reaching for one here would put a
         * second, versioned caching API in an action that does not need it.
         */
        return { ok: true, message }
    } catch (error) {
        return { ok: false, error: describe(error) }
    }
}

export async function setContactRead(id: string, read: boolean): Promise<ActionResult> {
    return run(async () => {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const before = await tx.contactForm.findUniqueOrThrow({
                where: { id },
                select: { status: true, isRead: true },
            })

            await tx.contactForm.update({
                where: { id },
                data: {
                    isRead: read,
                    readAt: read ? new Date() : null,
                    readBy: read ? admin.id : null,
                    /*
                     * Only the two automatic states move. An enquiry somebody has put
                     * IN_PROGRESS or RESPONDED must not be dragged back to READ by opening it,
                     * which is what a blind `status: read ? "READ" : "UNREAD"` would do.
                     */
                    status:
                        before.status === ContactFormStatus.UNREAD || before.status === ContactFormStatus.READ
                            ? read
                                ? ContactFormStatus.READ
                                : ContactFormStatus.UNREAD
                            : before.status,
                },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: read ? "contact.read" : "contact.unread",
                    entity: "ContactForm",
                    entityId: id,
                    diff: { isRead: [before.isRead, read] },
                },
            })
        })

        return read ? "Marked as read." : "Marked as unread."
    })
}

export async function setContactStatus(id: string, status: ContactFormStatus): Promise<ActionResult> {
    return run(async () => {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const before = await tx.contactForm.findUniqueOrThrow({
                where: { id },
                select: { status: true },
            })

            await tx.contactForm.update({
                where: { id },
                data: {
                    status,
                    // Anything beyond UNREAD implies somebody has looked at it.
                    ...(status === ContactFormStatus.UNREAD
                        ? { isRead: false, readAt: null, readBy: null }
                        : { isRead: true, readAt: new Date(), readBy: admin.id }),
                },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: `contact.${before.status.toLowerCase()}->${status.toLowerCase()}`,
                    entity: "ContactForm",
                    entityId: id,
                    diff: { status: [before.status, status] },
                },
            })
        })

        return "Status updated."
    })
}

export async function setContactPriority(id: string, priority: ContactPriority): Promise<ActionResult> {
    return run(async () => {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const before = await tx.contactForm.findUniqueOrThrow({
                where: { id },
                select: { priority: true },
            })
            await tx.contactForm.update({ where: { id }, data: { priority } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "contact.priority",
                    entity: "ContactForm",
                    entityId: id,
                    diff: { priority: [before.priority, priority] },
                },
            })
        })

        return "Priority updated."
    })
}

/**
 * Permanent removal.
 *
 * The enquiry and its replies go, and nothing keeps a copy — `ContactFormResponse` and
 * `ContactFormTag` both cascade. The audit row is written BEFORE the delete and records the
 * name and email, so the trail survives the record: an audit entry pointing at an id that no
 * longer resolves tells you a deletion happened and nothing about what was deleted.
 *
 * Marking an enquiry SPAM is the reversible alternative and is what the UI offers first.
 */
export async function deleteContact(id: string): Promise<ActionResult> {
    return run(async () => {
        const admin = await requireCurrentAdmin()

        await prisma.$transaction(async (tx) => {
            const form = await tx.contactForm.findUniqueOrThrow({
                where: { id },
                select: { fullName: true, email: true, status: true, createdAt: true },
            })

            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "contact.delete",
                    entity: "ContactForm",
                    entityId: id,
                    diff: {
                        fullName: form.fullName,
                        email: form.email,
                        status: form.status,
                        submittedAt: form.createdAt.toISOString(),
                    },
                },
            })

            await tx.contactForm.delete({ where: { id } })
        })

        return "Enquiry deleted."
    })
}
