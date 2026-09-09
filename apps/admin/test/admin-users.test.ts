import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestDatabase, type TestDatabase } from "@repo/database/test-harness"

let db: TestDatabase

const holder = vi.hoisted(() => ({ client: null as unknown }))
vi.mock("@repo/database", async () => {
    const actual = await vi.importActual<typeof import("@repo/database")>("@repo/database")
    return { ...actual, get prisma() { return holder.client } }
})

beforeAll(async () => {
    db = await createTestDatabase()
    holder.client = db.prisma
})
afterAll(async () => db?.drop())

beforeEach(async () => {
    await db.prisma.adminAuditLog.deleteMany()
    await db.prisma.session.deleteMany()
    await db.prisma.account.deleteMany()
    await db.prisma.user.deleteMany()

    await db.prisma.user.create({
        data: { id: "test-admin", email: "admin@newlight.invalid", name: "Test Admin", role: "SUPER_ADMIN", emailVerified: true },
    })
})

async function service() {
    return (await import("@/lib/services/admin-user-service")).AdminUserService
}

describe("creating an administrator", () => {
    it("creates the account with a credential, and returns the password once", async () => {
        const AdminUserService = await service()
        const result = await AdminUserService.create({
            email: "New.Admin@Example.com",
            name: "New Admin",
            role: "ADMIN",
        })

        expect(result.password).toHaveLength(24)
        expect(result.email).toBe("new.admin@example.com")

        const account = await db.prisma.account.findFirstOrThrow({ where: { userId: result.id } })
        expect(account.providerId).toBe("credential")
        expect(account.password).not.toBe(result.password)
    })

    it("never writes the password to the audit log", async () => {
        const AdminUserService = await service()
        const result = await AdminUserService.create({ email: "audited@example.com", name: "Audited", role: "ADMIN" })

        const row = await db.prisma.adminAuditLog.findFirstOrThrow({ where: { action: "admin.create" } })
        expect(JSON.stringify(row.diff)).not.toContain(result.password)
        expect(row.diff).toMatchObject({ email: "audited@example.com", role: "ADMIN" })
    })

    it("points at promotion when the email is already a customer", async () => {
        const AdminUserService = await service()
        await db.prisma.user.create({
            data: { email: "customer@example.com", name: "A Customer", role: "CUSTOMER", emailVerified: true },
        })

        await expect(
            AdminUserService.create({ email: "customer@example.com", name: "A Customer", role: "ADMIN" })
        ).rejects.toThrow(/Promote it instead/)
    })
})

describe("the two guards that stop the panel becoming unreachable", () => {
    it("refuses to let you change your own role", async () => {
        const AdminUserService = await service()
        await expect(AdminUserService.setRole("test-admin", "CUSTOMER")).rejects.toThrow(/your own role/)

        const me = await db.prisma.user.findUniqueOrThrow({ where: { id: "test-admin" } })
        expect(me.role).toBe("SUPER_ADMIN")
    })

    it("refuses to demote the last SUPER_ADMIN", async () => {
        const AdminUserService = await service()
        const other = await db.prisma.user.create({
            data: { email: "second@example.com", name: "Second", role: "SUPER_ADMIN", emailVerified: true },
        })

        await AdminUserService.setRole(other.id, "ADMIN")
        expect((await db.prisma.user.findUniqueOrThrow({ where: { id: other.id } })).role).toBe("ADMIN")

        await expect(AdminUserService.setRole("test-admin", "ADMIN")).rejects.toThrow(/your own role/)
    })

    it("refuses when the target is the only SUPER_ADMIN and the actor is not one of them", async () => {
        const AdminUserService = await service()
        await db.prisma.user.update({ where: { id: "test-admin" }, data: { role: "ADMIN" } })
        const only = await db.prisma.user.create({
            data: { email: "only@example.com", name: "Only", role: "SUPER_ADMIN", emailVerified: true },
        })

        await expect(AdminUserService.setRole(only.id, "ADMIN")).rejects.toThrow(/last SUPER_ADMIN/)
    })
})

describe("removing access", () => {
    it("revokes every session when someone is demoted", async () => {
        const AdminUserService = await service()
        const leaver = await db.prisma.user.create({
            data: { email: "leaver@example.com", name: "Leaver", role: "ADMIN", emailVerified: true },
        })
        await db.prisma.session.create({
            data: {
                userId: leaver.id,
                token: "t1",
                expiresAt: new Date(Date.now() + 86_400_000),
            },
        })

        const result = await AdminUserService.setRole(leaver.id, "CUSTOMER")
        expect(result.demoted).toBe(true)
        expect(await db.prisma.session.count({ where: { userId: leaver.id } })).toBe(0)

        const row = await db.prisma.adminAuditLog.findFirstOrThrow({ where: { action: "admin.revoke" } })
        expect(row.diff).toMatchObject({ from: "ADMIN", to: "CUSTOMER", sessionsRevoked: true })
    })

    it("does NOT revoke sessions on a promotion", async () => {
        const AdminUserService = await service()
        const rising = await db.prisma.user.create({
            data: { email: "rising@example.com", name: "Rising", role: "ADMIN", emailVerified: true },
        })
        await db.prisma.session.create({
            data: { userId: rising.id, token: "t2", expiresAt: new Date(Date.now() + 86_400_000) },
        })

        const result = await AdminUserService.setRole(rising.id, "SUPER_ADMIN")
        expect(result.demoted).toBe(false)
        expect(await db.prisma.session.count({ where: { userId: rising.id } })).toBe(1)
    })

    it("signs someone out without changing what they may do", async () => {
        const AdminUserService = await service()
        const user = await db.prisma.user.create({
            data: { email: "sessions@example.com", name: "Sessions", role: "ADMIN", emailVerified: true },
        })
        await db.prisma.session.createMany({
            data: [
                { userId: user.id, token: "a", expiresAt: new Date(Date.now() + 86_400_000) },
                { userId: user.id, token: "b", expiresAt: new Date(Date.now() + 86_400_000) },
            ],
        })

        const { count } = await AdminUserService.revokeSessions(user.id)
        expect(count).toBe(2)
        expect((await db.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("ADMIN")
    })
})
