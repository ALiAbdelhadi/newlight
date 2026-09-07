import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma, resolveLocale, type Locale } from "@repo/database"
import { sendOrQueue } from "@repo/mail/outbox"

/**
 * THE storefront auth seam.
 *
 * No other file in apps/www imports `better-auth`. That is the rule §7 asks for and the only
 * reason it is worth writing down: replacing the provider, adding a role, or fixing an
 * authorization bug should be a change to this file, not a search across 37 of them — which
 * is exactly the state Clerk left the codebase in, with nine separate comparisons of an email
 * against ADMIN_EMAIL doing the work of one role check.
 *
 * Verification and reset mail goes through @repo/mail's sendOrQueue: sent immediately because
 * a person is waiting on it, queued to the outbox if the transport is having a bad minute.
 */

const VERIFICATION_TTL_MINUTES = 60

function requiredEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        // Failing loudly at module load beats signing sessions with `undefined`, which
        // "works" until every session silently becomes forgeable.
        throw new Error(`${name} is not set. Authentication cannot start without it.`)
    }
    return value
}

/** A user's own language, not the language of whichever request triggered the email. */
function localeOf(user: { preferredLanguage?: string | null }): Locale {
    return resolveLocale(user.preferredLanguage)
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

    emailAndPassword: {
        enabled: true,
        // An unverified address can receive an order confirmation it never asked for, and is
        // the cheapest way to sign up as someone else.
        requireEmailVerification: true,
        minPasswordLength: 10,
        sendResetPassword: async ({ user, url }) => {
            await sendOrQueue(prisma, {
                template: "password-reset",
                to: user.email,
                locale: localeOf(user as { preferredLanguage?: string | null }),
                payload: { name: user.name, resetUrl: url, expiresInMinutes: VERIFICATION_TTL_MINUTES },
                // No dedupeKey: a second reset request is a new email, not a duplicate.
            })
        },
    },

    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendOrQueue(prisma, {
                template: "email-verification",
                to: user.email,
                locale: localeOf(user as { preferredLanguage?: string | null }),
                payload: { name: user.name, verifyUrl: url, expiresInMinutes: VERIFICATION_TTL_MINUTES },
            })
        },
    },

    user: {
        additionalFields: {
            // input: false — a sign-up request must not be able to nominate its own role.
            role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
            phoneNumber: { type: "string", required: false, input: true },
            preferredLanguage: { type: "string", required: false, defaultValue: "ar", input: true },
            preferredCurrency: { type: "string", required: false, defaultValue: "EGP", input: false },
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
    },

    // Must be last: it is what lets server actions set cookies.
    plugins: [nextCookies()],
})

export type Identity = {
    id: string
    email: string
    name: string
    role: string
    emailVerified: boolean
    preferredLanguage: Locale
}

/**
 * The current user, or null. The ONE way a storefront route learns who is asking.
 *
 * `headers` is passed in rather than read here because Next's `headers()` is only callable
 * from a server component or route handler, and making that this module's problem would stop
 * it being usable from anywhere else.
 */
export async function getIdentity(headers: Headers): Promise<Identity | null> {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) return null
    const user = session.user as typeof session.user & {
        role?: string | null
        preferredLanguage?: string | null
    }
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? "CUSTOMER",
        emailVerified: user.emailVerified,
        preferredLanguage: resolveLocale(user.preferredLanguage),
    }
}

export class UnauthenticatedError extends Error {
    constructor() {
        super("authentication required")
        this.name = "UnauthenticatedError"
    }
}

/** For call sites where "not signed in" is an error rather than a state to render. */
export async function requireIdentity(headers: Headers): Promise<Identity> {
    const identity = await getIdentity(headers)
    if (!identity) throw new UnauthenticatedError()
    return identity
}

/**
 * The request-scoped shorthands. Most call sites only need "who is asking", and making each
 * of them write `getIdentity(await headers())` is how a codebase ends up with thirty slightly
 * different spellings of the same question.
 */
export async function currentIdentity(): Promise<Identity | null> {
    const { headers } = await import("next/headers")
    return getIdentity(await headers())
}

/** null when signed out. Prefer currentIdentity() when you also need the role or locale. */
export async function currentUserId(): Promise<string | null> {
    return (await currentIdentity())?.id ?? null
}
