/* eslint-disable @typescript-eslint/no-explicit-any */

import { requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"


export async function GET(request: NextRequest) {
    try {
        // One guard. requireCurrentAdmin() throws on both "not signed in" and
        // "signed in but not an admin", so a forgotten check fails closed.
        const admin = await requireCurrentAdmin()
        const userId = admin.id

        const searchParams = request.nextUrl.searchParams
        const isRead = searchParams.get("isRead")
        const type = searchParams.get("type")
        const limit = parseInt(searchParams.get("limit") || "50")

        // `expiresAt` is part of the model and was read by nothing, so a caller that set it
        // got a notification that never expired — a field that silently does not work is worse
        // than one that does not exist. NULL means "no expiry", which is almost every row.
        const live = { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }

        const where: any = { ...live }
        if (isRead !== null) where.isRead = isRead === "true"
        if (type) where.type = type

        /*
         * Newest first, and priority NOT first.
         *
         * Nothing read this endpoint until the bell did, so the old ordering had never been
         * seen: it sorted by priority before date, which pins a week-old HIGH notification
         * above this morning's news and — with a limit — means a brand-new NORMAL one does
         * not appear in the bell AT ALL once thirty HIGH ones exist above it. A notification
         * list is chronological; priority is carried by the accent colour on each row and by
         * whether the OS banner stays on screen, which is where loudness belongs.
         */
        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
        })

        /*
         * The unread count is deliberately NOT scoped by the caller's filters — it is the
         * badge on the bell, which answers "how much is waiting for me", not "how much of
         * what I am currently looking at". It does share the expiry predicate: a badge
         * counting rows the list refuses to show is a badge that never reaches zero however
         * much the person reads.
         */
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
        // One guard. requireCurrentAdmin() throws on both "not signed in" and
        // "signed in but not an admin", so a forgotten check fails closed.
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