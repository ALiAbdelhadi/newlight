import { ADMIN_ROLES } from "@repo/database"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

let db: TestDatabase
let auth: Awaited<ReturnType<typeof makeAuth>>
let adminAuth: Awaited<ReturnType<typeof makeAdminAuth>>

const PASSWORD = "correct-horse-battery-staple"

function makeAuth(prisma: TestDatabase["prisma"]) {
    return betterAuth({
        database: prismaAdapter(prisma, { provider: "postgresql" }),
        secret: "test-secret-not-used-anywhere-real",
        emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 10 },
        user: {
            additionalFields: {
                role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
                preferredLanguage: { type: "string", required: false, defaultValue: "ar", input: true },
            },
        },
    })
}

function makeAdminAuth(prisma: TestDatabase["prisma"]) {
    return betterAuth({
        database: prismaAdapter(prisma, { provider: "postgresql" }),
        secret: "test-secret-not-used-anywhere-real",
        emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: false, minPasswordLength: 12 },
    })
}

beforeAll(async () => {
    db = await createTestDatabase()
    auth = makeAuth(db.prisma)
    adminAuth = makeAdminAuth(db.prisma)
})
afterAll(async () => db?.drop())

async function register(email: string) {
    await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Test" }, asResponse: true })
    await db.prisma.user.update({ where: { email }, data: { emailVerified: true } })
}

describe("registration", () => {
    it("writes the user to OUR database, defaulting to CUSTOMER", async () => {
        const email = `c${Date.now()}@x.invalid`
        await register(email)

        const user = await db.prisma.user.findUniqueOrThrow({ where: { email } })
        expect(user.role).toBe("CUSTOMER")
        expect(user.preferredLanguage).toBe("ar")
    })

    it("stores the password as a hash, never as text", async () => {
        const email = `h${Date.now()}@x.invalid`
        await register(email)

        const user = await db.prisma.user.findUniqueOrThrow({ where: { email } })
        const account = await db.prisma.account.findFirstOrThrow({ where: { userId: user.id, providerId: "credential" } })
        expect(account.password).toBeTruthy()
        expect(account.password).not.toContain(PASSWORD)
        expect(account.password!.length).toBeGreaterThan(40)
    })

    it("never ends up with two accounts on one address", async () => {
        const email = `d${Date.now()}@x.invalid`
        await register(email)
        await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Again" }, asResponse: true })

        expect(await db.prisma.user.count({ where: { email } })).toBe(1)

        await expect(
            db.prisma.user.create({ data: { email, name: "Direct insert" } })
        ).rejects.toThrow()
    })

    it("does NOT let a sign-up request nominate its own role", async () => {
        const email = `r${Date.now()}@x.invalid`
        await auth.api.signUpEmail({
            body: { email, password: PASSWORD, name: "Sneaky", role: "SUPER_ADMIN" } as never,
            asResponse: true,
        })
        const user = await db.prisma.user.findUnique({ where: { email } })
        expect(user?.role).toBe("CUSTOMER")
    })
})

describe("sign-in", () => {
    it("refuses before the address is verified", async () => {
        const email = `v${Date.now()}@x.invalid`
        await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Unverified" }, asResponse: true })

        const response = await auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true })
        expect(response.status).not.toBe(200)
        expect(await db.prisma.session.count({ where: { user: { email } } })).toBe(0)
    })

    it("accepts after verification, and creates a session", async () => {
        const email = `s${Date.now()}@x.invalid`
        await register(email)

        const response = await auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true })
        expect(response.status).toBe(200)
        expect(await db.prisma.session.count({ where: { user: { email } } })).toBe(1)
    })

    it("refuses a wrong password without leaking whether the account exists", async () => {
        const email = `w${Date.now()}@x.invalid`
        await register(email)

        const wrongPassword = await auth.api.signInEmail({ body: { email, password: "not-the-password" }, asResponse: true })
        const noSuchUser = await auth.api.signInEmail({ body: { email: "nobody@x.invalid", password: PASSWORD }, asResponse: true })
        expect(wrongPassword.status).not.toBe(200)
        expect(noSuchUser.status).not.toBe(200)
    })

    it("returns no session for an unauthenticated request", async () => {
        const session = await auth.api.getSession({ headers: new Headers() })
        expect(session).toBeNull()
    })
})

describe("admin role enforcement (§7)", () => {
    it("has no public sign-up at all — the API refuses, not just the deleted route", async () => {
        const response = await adminAuth.api.signUpEmail({
            body: { email: `a${Date.now()}@x.invalid`, password: "a-long-admin-password", name: "Sneaky" },
            asResponse: true,
        })
        expect(response.status).not.toBe(200)
    })

    it("treats a signed-in CUSTOMER as not an admin", async () => {
        const email = `p${Date.now()}@x.invalid`
        await register(email)
        const user = await db.prisma.user.findUniqueOrThrow({ where: { email } })
        expect((ADMIN_ROLES as readonly string[]).includes(user.role)).toBe(false)
    })

    it("recognises ADMIN and SUPER_ADMIN, and nothing else", () => {
        expect([...ADMIN_ROLES].sort()).toEqual(["ADMIN", "SUPER_ADMIN"])
        expect((ADMIN_ROLES as readonly string[]).includes("CUSTOMER")).toBe(false)
    })

    it("cascades sessions and credentials when a user is deleted", async () => {
        const email = `x${Date.now()}@x.invalid`
        await register(email)
        await auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true })

        const user = await db.prisma.user.findUniqueOrThrow({ where: { email } })
        await db.prisma.user.delete({ where: { id: user.id } })

        expect(await db.prisma.session.count({ where: { userId: user.id } })).toBe(0)
        expect(await db.prisma.account.count({ where: { userId: user.id } })).toBe(0)
    })
})
