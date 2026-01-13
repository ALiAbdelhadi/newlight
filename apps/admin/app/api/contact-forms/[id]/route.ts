/* eslint-disable @typescript-eslint/no-explicit-any */

import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@repo/database"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        const contactForm = await prisma.contactForm.findUnique({
            where: { id },
            include: {
                responses: {
                    orderBy: { createdAt: "asc" },
                },
                tags: true,
            },
        })

        if (!contactForm) {
            return NextResponse.json(
                { error: "Contact form not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(contactForm)
    } catch (error) {
        console.error("Error fetching contact form:", error)
        return NextResponse.json(
            { error: "Failed to fetch contact form" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()

        const updateData: any = {}

        if (body.isRead !== undefined) {
            updateData.isRead = body.isRead
            if (body.isRead) {
                updateData.readAt = new Date()
                updateData.readBy = userId
            }
        }

        if (body.status) updateData.status = body.status
        if (body.priority) updateData.priority = body.priority
        if (body.notes !== undefined) updateData.notes = body.notes

        const contactForm = await prisma.contactForm.update({
            where: { id },
            data: updateData,
            include: {
                responses: true,
                tags: true,
            },
        })

        return NextResponse.json(contactForm)
    } catch (error) {
        console.error("Error updating contact form:", error)
        return NextResponse.json(
            { error: "Failed to update contact form" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params

        await prisma.contactForm.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting contact form:", error)
        return NextResponse.json(
            { error: "Failed to delete contact form" },
            { status: 500 }
        )
    }
}
