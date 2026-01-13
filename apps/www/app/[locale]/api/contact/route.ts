/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const contactFormSchema = z.object({
    fullName: z.string().min(2).max(100),
    jobPosition: z.string().min(2).max(100),
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(20),
    message: z.string().optional(),
})
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const limit = rateLimitMap.get(ip)

    if (!limit || now > limit.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 })
        return true
    }

    if (limit.count >= 3) {
        return false
    }

    limit.count++
    return true
}

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown"
        if (!checkRateLimit(ip)) {
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

        const contactForm = await prisma.contactForm.create({
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

        await createAdminNotifications({
            type: "NEW_CONTACT_FORM",
            title: "New Contact Form Submission",
            message: `${data.fullName} from ${data.jobPosition} has submitted a contact form`,
            actionUrl: `/admin/contact-forms/${contactForm.id}`,
            metadata: {
                contactFormId: contactForm.id,
                email: data.email,
                phone: data.phoneNumber,
            },
        })

        await sendPushNotifications({
            title: "New Contact Form",
            body: `${data.fullName} submitted a contact form`,
            data: {
                url: `/admin/contact-forms/${contactForm.id}`,
                contactFormId: contactForm.id,
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
    type: string
    title: string
    message: string
    actionUrl: string
    metadata: Record<string, any>
}) {
    try {
        const adminEmail = process.env.ADMIN_EMAIL

        if (!adminEmail) {
            console.warn("No admin email configured")
            return
        }
        const adminUser = await prisma.user.findUnique({
            where: { email: adminEmail },
        })

        if (!adminUser) {
            console.warn("Admin user not found in database")
            return
        }

        await prisma.notification.create({
            data: {
                userId: adminUser.id,
                type: notificationData.type as any,
                title: notificationData.title,
                message: notificationData.message,
                actionUrl: notificationData.actionUrl,
                metadata: notificationData.metadata,
                priority: "NORMAL",
            },
        })
    } catch (error) {
        console.error("Failed to create admin notifications:", error)
    }
}

async function sendPushNotifications(payload: {
    title: string
    body: string
    data?: Record<string, any>
}) {
    try {
        const adminEmail = process.env.ADMIN_EMAIL
        if (!adminEmail) return

        const adminUser = await prisma.user.findUnique({
            where: { email: adminEmail },
        })

        if (!adminUser) return

        const subscriptions = await prisma.pushSubscription.findMany({
            where: {
                userId: adminUser.id,
                isActive: true,
            },
        })

        const webpush = await import("web-push")
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
        const vapidEmail = process.env.VAPID_EMAIL || adminEmail

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn("VAPID keys not configured")
            return
        }

        webpush.default.setVapidDetails(
            `mailto:${vapidEmail}`,
            vapidPublicKey,
            vapidPrivateKey
        )

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: "/icon-192x192.png",
            badge: "/badge-72x72.png",
            data: payload.data,
        })

        await Promise.all(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.default.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        pushPayload
                    )

                    await prisma.pushSubscription.update({
                        where: { id: sub.id },
                        data: { lastUsedAt: new Date() },
                    })
                } catch (error: any) {
                    console.error("Push notification failed:", error)

                    if (error.statusCode === 410) {
                        await prisma.pushSubscription.update({
                            where: { id: sub.id },
                            data: { isActive: false },
                        })
                    }
                }
            })
        )
    } catch (error) {
        console.error("Failed to send push notifications:", error)
    }
}