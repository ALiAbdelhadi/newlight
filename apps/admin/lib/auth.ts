import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { isAdminRole, prisma, type AdminRole } from "@repo/database"

function requiredEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set. Authentication cannot start without it.`)
    return value
}

// Every origin this deployment can be reached on. Better Auth refuses a sign-in whose Origin
// header is not the baseURL or one of these, so the *.vercel.app addresses (production alias,
// branch alias, and the per-deployment URL) must be listed alongside the custom domain, or a
// browser on any of them gets INVALID_ORIGIN before the password is even looked at.
function deploymentOrigins(): string[] {
    const explicit = [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_ADMIN_URL]
    const vercel = [
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_URL,
    ].map((host) => (host ? `https://${host}` : undefined))
    const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((value) => value.trim())
    return [...new Set([...explicit, ...vercel, ...extra].filter((value): value is string => Boolean(value)))]
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    baseURL:
        process.env.BETTER_AUTH_URL ??
        process.env.NEXT_PUBLIC_ADMIN_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined),
    trustedOrigins: deploymentOrigins(),

    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        requireEmailVerification: false,
        minPasswordLength: 12,
    },

    user: {
        additionalFields: {
            role: { type: "string", required: false, defaultValue: "ADMIN", input: false },
        },
    },

    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },

    plugins: [nextCookies()],
})

export { ADMIN_ROLES, type AdminRole } from "@repo/database"

export interface AdminIdentity {
    id: string
    email: string
    name: string
    role: AdminRole
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

export async function getIdentity(headers: Headers): Promise<AdminIdentity | null> {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) return null
    const user = session.user as typeof session.user & { role?: string | null }
    const role = user.role ?? "CUSTOMER"
    if (!isAdminRole(role)) return null
    return { id: user.id, email: user.email, name: user.name, role, image: user.image ?? null }
}

export async function requireAdmin(headers: Headers): Promise<AdminIdentity> {
    const session = await auth.api.getSession({ headers })
    if (!session?.user) throw new UnauthenticatedError()
    const user = session.user as typeof session.user & { role?: string | null }
    const role = user.role ?? "CUSTOMER"
    if (!isAdminRole(role)) throw new ForbiddenError(role)
    return { id: user.id, email: user.email, name: user.name, role, image: user.image ?? null }
}

export async function requireSuperAdmin(headers: Headers): Promise<AdminIdentity> {
    const identity = await requireAdmin(headers)
    if (identity.role !== "SUPER_ADMIN") throw new ForbiddenError(identity.role)
    return identity
}

export async function requireCurrentSuperAdmin(): Promise<AdminIdentity> {
    const { headers } = await import("next/headers")
    return requireSuperAdmin(await headers())
}

export async function currentAdmin(): Promise<AdminIdentity | null> {
    const { headers } = await import("next/headers")
    return getIdentity(await headers())
}

export async function requireCurrentAdmin(): Promise<AdminIdentity> {
    const { headers } = await import("next/headers")
    return requireAdmin(await headers())
}

export async function currentAdminId(): Promise<string | null> {
    return (await currentAdmin())?.id ?? null
}
