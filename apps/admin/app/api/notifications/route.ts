/* eslint-disable @typescript-eslint/no-explicit-any */

import { requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await requireCurrentAdmin()
        const userId = admin.id

        const searchParams = request.nextUrl.searchParams
        const isRead = searchParams.get("isRead")
        const type = searchParams.get("type")
        const limit = parseInt(searchParams.get("limit") || "50")

        const live = { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }

        const where: any = { ...live }
        if (isRead !== null) where.isRead = isRead === "true"
        if (type) where.type = type

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
        })

        const unreadCount = await prisma.notification.count({
            where: { ...live, isRead: false },
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
        const admin = await requireCurrentAdmin()
        const userId = admin.id

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