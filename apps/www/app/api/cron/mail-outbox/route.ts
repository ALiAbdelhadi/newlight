import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@repo/database"
import { dispatchOutbox } from "@repo/mail/outbox"

import { authorizeCron } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const denied = authorizeCron(request, "MAIL_OUTBOX_CRON_SECRET", "cron:mail")
    if (denied) return denied

    const summary = await dispatchOutbox(prisma)
    if (summary.failed > 0) {
        console.error(`[cron:mail] ${summary.failed} message(s) exhausted their retries and are now FAILED.`)
    }
    return NextResponse.json(summary)
}
