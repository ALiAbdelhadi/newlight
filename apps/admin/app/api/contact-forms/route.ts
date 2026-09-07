/* eslint-disable @typescript-eslint/no-explicit-any */
import { currentAdmin, currentAdminId, requireCurrentAdmin } from "@/lib/auth"
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        // One guard. requireCurrentAdmin() throws on both "not signed in" and
        // "signed in but not an admin", so a forgotten check fails closed.
        const admin = await requireCurrentAdmin()
        const userId = admin.id

        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get("status")
        const isRead = searchParams.get("isRead")
        const limit = parseInt(searchParams.get("limit") || "50")
        const offset = parseInt(searchParams.get("offset") || "0")

        const where: any = {}
        if (status) where.status = status
        if (isRead !== null) where.isRead = isRead === "true"

        const [contactForms, total] = await Promise.all([
            prisma.contactForm.findMany({
                where,
                include: {
                    responses: {
                        orderBy: { createdAt: "desc" },
                    },
                    tags: true,
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.contactForm.count({ where }),
        ])

        return NextResponse.json({
            contactForms,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        })
    } catch (error) {
        console.error("Error fetching contact forms:", error)
        return NextResponse.json(
            { error: "Failed to fetch contact forms" },
            { status: 500 }
        )
    }
}

