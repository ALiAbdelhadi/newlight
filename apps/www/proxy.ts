import createIntlMiddleware from "next-intl/middleware"
import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

/**
 * next-intl, plus a cheap signed-out redirect for the routes that need one.
 *
 * The order matters and is the opposite of what it was: Clerk wrapped intl, so every request
 * paid for a Clerk check before it was even localised. Here intl runs for everything and the
 * session cookie is only consulted for protected paths.
 *
 * `getSessionCookie` reads the cookie WITHOUT hitting the database — middleware runs on every
 * request including static-ish ones, and a query there is a per-request cost for a check the
 * page repeats anyway. It is an optimistic gate, not the authorization: the real check is
 * `getIdentity()` in the page or action. A forged cookie gets past this and fails there.
 */
const PROTECTED = ["/orders", "/confirm", "/complete"]

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // API routes are NOT localised, and localising them broke authentication.
    //
    // The matcher below deliberately includes `/(api|trpc)(.*)`, so every request to
    // `/api/auth/*` fell through to `intlMiddleware`, which redirected it to
    // `/en/api/auth/get-session` — a route that does not exist. Every client-side session read
    // answered 404, so the storefront could not tell a signed-in visitor from a signed-out one
    // anywhere on the client.
    //
    // The matcher stays: a protected API route would still want the session gate above. What
    // changes is that localisation stops here, where it never applied.
    if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
        return NextResponse.next()
    }

    // Strip the locale segment so "/ar/orders" and "/en/orders" match one entry.
    const withoutLocale = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/"

    if (PROTECTED.some((path) => withoutLocale === path || withoutLocale.startsWith(`${path}/`))) {
        if (!getSessionCookie(request)) {
            const locale = pathname.match(/^\/(en|ar)(?=\/|$)/)?.[1] ?? routing.defaultLocale
            const signIn = new URL(`/${locale}/sign-in`, request.url)
            signIn.searchParams.set("redirectTo", pathname)
            return NextResponse.redirect(signIn)
        }
    }

    return intlMiddleware(request)
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files (with extensions)
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
