import { prisma, resolveLocale, consume, NotificationType, Prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"
import { queueMail } from "@repo/mail/outbox"
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

            return created
        })

        await createAdminNotifications({
            type: NotificationType.NEW_CONTACT_FORM,
            title: "New Contact Form Submission",
            message: `${data.fullName} from ${data.jobPosition} has submitted a contact form`,
            actionUrl: `/admin/contact-forms/${contactForm.id}`,
            metadata: {
                contactFormId: contactForm.id,
                email: data.email,
                phone: data.phoneNumber,
            },
        })

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

async function createAdminNotifications(notificationData: {
    type: NotificationType
    title: string
    message: string
    actionUrl: string
    metadata: Prisma.InputJsonValue
}) {
    try {
        // Every administrator, by ROLE. The previous version looked up one user by
        // process.env.ADMIN_EMAIL and gave up silently when it did not match a row — so a
        // second administrator, or a changed address, meant notifications that went nowhere.
        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
            select: { id: true },
        })

        if (admins.length === 0) {
            console.warn("[contact] no ADMIN or SUPER_ADMIN users exist; in-app notification skipped.")
            return
        }

        await prisma.notification.createMany({
            data: admins.map((admin) => ({
                userId: admin.id,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                actionUrl: notificationData.actionUrl,
                metadata: notificationData.metadata,
                priority: "NORMAL" as const,
            })),
        })
    } catch (error) {
        // An in-app notification failing must not fail the form submission — the email
        // outbox row is already committed and is the reliable channel.
        console.error("Failed to create admin notifications:", error)
    }
}
