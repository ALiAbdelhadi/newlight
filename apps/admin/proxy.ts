import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

/**
 * The admin app is entirely private, so the default is "signed out means sign in" rather than
 * a list of protected paths — the failure mode of an allowlist is one forgotten route.
 *
 * This is an optimistic cookie check only. It never decides whether someone is an ADMIN; that
 * is `requireAdmin()` in the page or action, which reads the role from the database. A cookie
 * gets you past this line and no further.
 */
const PUBLIC = ["/sign-in", "/api/auth"]

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    if (PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next()
    }
    if (!getSessionCookie(request)) {
        return NextResponse.redirect(new URL("/sign-in", request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
}
