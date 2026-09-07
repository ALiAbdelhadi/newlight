import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@repo/database"
import { dispatchOutbox } from "@repo/mail/outbox"

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
    const secret = process.env.MAIL_OUTBOX_CRON_SECRET
    if (!secret) {
        console.error("[cron:mail] MAIL_OUTBOX_CRON_SECRET is not set; refusing to run unauthenticated.")
        return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the query form is for a manual
    // run during an incident, when reaching for curl is faster than reaching for the console.
    const header = request.headers.get("authorization")
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret")
    if (provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const summary = await dispatchOutbox(prisma)
    if (summary.failed > 0) {
        console.error(`[cron:mail] ${summary.failed} message(s) exhausted their retries and are now FAILED.`)
    }
    return NextResponse.json(summary)
}
