"use server"

import { revalidatePath } from "next/cache"
import { ContactFormStatus, ContactPriority, prisma } from "@repo/database"

import { ForbiddenError, requireCurrentAdmin, UnauthenticatedError } from "@/lib/auth"
import type { ActionResult } from "@/app/action/catalog-actions"

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
