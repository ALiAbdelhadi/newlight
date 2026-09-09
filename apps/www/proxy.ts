import createIntlMiddleware from "next-intl/middleware"
import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const PROTECTED = ["/account", "/cart", "/orders", "/confirm", "/complete"]

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
        return NextResponse.next()
    }

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
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
        "/(api|trpc)(.*)",
    ],
}
