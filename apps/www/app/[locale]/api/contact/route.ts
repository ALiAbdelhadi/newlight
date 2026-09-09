import { prisma, resolveLocale, consume } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"
import { queueMail } from "@repo/mail/outbox"
import { adminRecipients, dispatchPushSoon, notifyRecipients } from "@repo/notifications"
import { z } from "zod"

const contactFormSchema = z.object({
    fullName: z.string().min(2).max(100),
    jobPosition: z.string().min(2).max(100),
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(20),
    message: z.string().optional(),
})
/**
 * Three submissions a minute from one address.
 *
 * This used to be a module-level `Map`, which is per-instance and reset on every cold start —
 * so on serverless each new instance started every caller at zero, on the one unauthenticated
 * write endpoint the storefront has. `consume` counts in a row that every instance can see.
 */
const CONTACT_LIMIT = 3
const CONTACT_WINDOW_SECONDS = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    // The route lives under app/[locale], so the acknowledgement goes out in the language the
    // person was actually reading when they filled the form in.
    const { locale } = await params
    try {
        const ip = request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown"
        const rate = await consume(prisma, `contact:${ip}`, CONTACT_LIMIT, CONTACT_WINDOW_SECONDS)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            )
        }

        const body = await request.json()
        const validation = contactFormSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input", details: validation.error },
                { status: 400 }
            )
        }

        const data = validation.data

        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? ""

        // Outside the transaction, like everywhere else: the recipients are a slow-changing
        // fact, and reading them inside is what put a predicate lock on `users` in the order
        // path. Uniform here even though this transaction is READ COMMITTED, so there is one
        // shape to recognise rather than two.
        const recipients = await adminRecipients(prisma)

        // The form row and BOTH emails commit together (§16). If the transaction rolls back
        // there is no orphaned "we received your message" for a message nobody received; if
        // it commits, the mail is queued and the sweep will deliver it even if the transport
        // is down right now.
        const contactForm = await prisma.$transaction(async (tx) => {
            const created = await tx.contactForm.create({
                data: {
                    fullName: data.fullName,
                    jobPosition: data.jobPosition,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    message: data.message || "",
                    ipAddress: ip,
                    userAgent: request.headers.get("user-agent") || undefined,
                },
            })

            await queueMail(tx, {
                template: "contact-acknowledgement",
                to: data.email,
                locale: resolveLocale(locale),
                payload: { fullName: data.fullName },
                dedupeKey: `contact-ack:${created.id}`,
            })

            const notifyAddress = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM
            if (notifyAddress) {
                await queueMail(tx, {
                    template: "contact-admin-notification",
                    // Admin mail is English-only by design; the admin app has no i18n.
                    to: notifyAddress,
                    locale: "en",
                    payload: {
                        fullName: data.fullName,
                        email: data.email,
                        phoneNumber: data.phoneNumber,
                        jobPosition: data.jobPosition,
                        message: data.message || undefined,
                        adminUrl: `${adminUrl}/admin/contact-forms/${created.id}`,
                    },
                    dedupeKey: `contact-admin:${created.id}`,
                })
            } else {
                console.warn("[contact] neither EMAIL_REPLY_TO nor EMAIL_FROM is set; no admin notification queued.")
            }

            // In the transaction, beside the mail. It used to run after the commit in a
            // helper that swallowed its own errors, so a form could be stored with no
            // notification and nothing anywhere saying so (§17).
            await notifyRecipients(tx, recipients, {
                type: "NEW_CONTACT_FORM",
                title: "New contact form",
                message: `${data.fullName} (${data.jobPosition}) submitted the contact form.`,
                // `/admin/contact-forms/<id>` was never a route in the admin app — the
                // notification linked to a 404 from the day it was written. The queue is at
                // `/admin/contact`.
                actionUrl: "/admin/contact",
                metadata: {
                    contactFormId: created.id,
                    email: data.email,
                    phone: data.phoneNumber,
                },
            })

            return created
        })

        // After the commit, and not awaited: the enquiry is already stored, and the person
        // waiting on this response should not also wait on Google's push service. The cron
        // sweep is what makes the delivery a guarantee rather than a hope.
        dispatchPushSoon(prisma)

        return NextResponse.json(
            {
                success: true,
                message: "Contact form submitted successfully",
                id: contactForm.id,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Contact form submission error:", error)
        return NextResponse.json(
            { error: "Failed to submit contact form" },
            { status: 500 }
        )
    }
}
