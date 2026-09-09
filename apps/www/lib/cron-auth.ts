import { NextResponse, type NextRequest } from "next/server"

/**
 * The authorisation every cron endpoint shares.
 *
 * It was eight identical lines in each of the sweep routes, which is one place per route for
 * the query-string fallback to be forgotten the next time somebody adds one. The secret NAME
 * stays a parameter rather than being fixed here: the sweeps were provisioned with separate
 * secrets on purpose, so rotating the one that sends email does not silently also open the one
 * that releases stock.
 *
 * Returns null when the request may proceed, and the response to return when it may not — so a
 * caller reads as `const denied = authorizeCron(...); if (denied) return denied`.
 */
export function authorizeCron(request: NextRequest, secretName: string, logTag: string): NextResponse | null {
    const secret = process.env[secretName]
    if (!secret) {
        console.error(`[${logTag}] ${secretName} is not set; refusing to run unauthenticated.`)
        return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the query form is for a manual
    // run during an incident, when reaching for curl is faster than reaching for the console.
    const header = request.headers.get("authorization")
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("secret")
    if (provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    return null
}
