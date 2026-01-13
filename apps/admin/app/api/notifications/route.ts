/* eslint-disable @typescript-eslint/no-explicit-any */

import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"


export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const searchParams = request.nextUrl.searchParams
        const isRead = searchParams.get("isRead")
        const type = searchParams.get("type")
        const limit = parseInt(searchParams.get("limit") || "50")

        const where: any = { userId }
        if (isRead !== null) where.isRead = isRead === "true"
        if (type) where.type = type

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            take: limit,
        })

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        })

        return NextResponse.json({
            notifications,
            unreadCount,
        })
    } catch (error) {
        console.error("Error fetching notifications:", error)
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { notificationIds, markAllAsRead } = body

        if (markAllAsRead) {
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true, readAt: new Date() },
            })
        } else if (notificationIds && Array.isArray(notificationIds)) {
            await prisma.notification.updateMany({
                where: { id: { in: notificationIds }, userId },
                data: { isRead: true, readAt: new Date() },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating notifications:", error)
        return NextResponse.json(
            { error: "Failed to update notifications" },
            { status: 500 }
        )
    }
}