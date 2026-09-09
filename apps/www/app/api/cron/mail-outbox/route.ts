import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@repo/database"
import { dispatchOutbox } from "@repo/mail/outbox"

import { authorizeCron } from "@/lib/cron-auth"

/**
 * The outbox sweep — BUILD §16.
 *
 * Runs on a Vercel Cron schedule and is what makes the outbox a delivery guarantee rather
 * than a table of good intentions: anything queued inside a business transaction, and
 * anything whose direct send failed, is retried here with backoff.
 *
 * Lives in apps/www because it needs both @repo/database and @repo/mail, and @repo/database
 * must not depend on @repo/mail — @repo/mail already depends on it, and a cycle between two
 * workspace packages is a build problem waiting for the wrong bundler.
 *
 * Authorised by a shared secret, not by obscurity: this endpoint sends email, and an open URL
 * that sends email is an open URL that sends email for someone else.
 */
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
