import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { isAdminRole, prisma, type AdminRole } from "@repo/database"

/**
 * THE admin auth seam.
 *
 * Separate from the storefront's on purpose: an admin identity is not a customer identity
 * that happens to have a flag. Concretely, this instance has **no sign-up path at all** —
 * `disableSignUp` is set and the public sign-up route is deleted. The first SUPER_ADMIN is
 * seeded by a CLI script (`packages/database/scripts/seed-super-admin.ts`), because the only
 * safe way to create the first administrator is out of band.
 *
 * This file and this file alone imports `better-auth` in apps/admin. It replaces NINE
 * comparisons of `user.emailAddresses[0].emailAddress` against `process.env.ADMIN_EMAIL`
 * spread across nine files — a scheme where forgetting one comparison is an unguarded route
 * and nobody can tell by reading.
 */

function requiredEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set. Authentication cannot start without it.`)
    return value
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL,

    emailAndPassword: {
        enabled: true,
        // No self-service registration. There is no route, and the API refuses too, so a
        // deleted page cannot be worked around by posting to the endpoint directly.
        disableSignUp: true,
        // Administrators are created by a person who already has access, so there is nobody
        // to verify an address to; requiring it would lock out the account being created.
        requireEmailVerification: false,
        minPasswordLength: 12,
    },

    user: {
        additionalFields: {
            role: { type: "string", required: false, defaultValue: "ADMIN", input: false },
        },
    },

    // Shorter than the storefront's 30 days: an admin session is worth more.
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },

    plugins: [nextCookies()],
})

// Re-exported, not redeclared: the roles are a domain fact and live in @repo/database, where
// a test can import them without building an auth instance.
export { ADMIN_ROLES, type AdminRole } from "@repo/database"

export interface AdminIdentity {
    id: string
    email: string
    name: string
    role: AdminRole
    /** Avatar URL. Null until an administrator uploads one. */
    image: string | null
}

export class UnauthenticatedError extends Error {
    constructor() {
        super("authentication required")
        this.name = "UnauthenticatedError"
    }
}

export class ForbiddenError extends Error {
    constructor(role: string) {
        super(`role ${role} may not access the admin panel`)
        this.name = "ForbiddenError"
    }
}

/** The current admin, or null. Returns null for a signed-in CUSTOMER — being signed in is not being an admin. */
export async function getIdentity(headers: Headers): Promise<AdminIdentity | null> {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) return null
    const user = session.user as typeof session.user & { role?: string | null }
    const role = user.role ?? "CUSTOMER"
    if (!isAdminRole(role)) return null
    return { id: user.id, email: user.email, name: user.name, role, image: user.image ?? null }
}

/**
 * The single authorization check for the whole admin app. Throws rather than returning null,
 * so a call site that forgets to check the result still fails closed.
 */
export async function requireAdmin(headers: Headers): Promise<AdminIdentity> {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new UnauthenticatedError()
    const user = session.user as typeof session.user & { role?: string | null }
    const role = user.role ?? "CUSTOMER"
    if (!isAdminRole(role)) throw new ForbiddenError(role)
    return { id: user.id, email: user.email, name: user.name, role, image: user.image ?? null }
}

/** SUPER_ADMIN only — for actions that create or demote other administrators. */
export async function requireSuperAdmin(headers: Headers): Promise<AdminIdentity> {
    const identity = await requireAdmin(headers)
    if (identity.role !== "SUPER_ADMIN") throw new ForbiddenError(identity.role)
    return identity
}

/** Request-scoped shorthands, so no route has to spell out `await headers()` to ask who is asking. */
export async function requireCurrentSuperAdmin(): Promise<AdminIdentity> {
    const { headers } = await import("next/headers")
    return requireSuperAdmin(await headers())
}

export async function currentAdmin(): Promise<AdminIdentity | null> {
    const { headers } = await import("next/headers")
    return getIdentity(await headers())
}

/**
 * The guard every admin route and server action starts with. Throws on both "not signed in"
 * and "signed in but not an admin", so a forgotten check fails closed.
 */
export async function requireCurrentAdmin(): Promise<AdminIdentity> {
    const { headers } = await import("next/headers")
    return requireAdmin(await headers())
}

/** null when signed out — for recording an actor id on an audit row. */
export async function currentAdminId(): Promise<string | null> {
    return (await currentAdmin())?.id ?? null
}
