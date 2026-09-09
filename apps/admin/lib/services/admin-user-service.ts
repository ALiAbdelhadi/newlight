import { randomBytes } from "node:crypto"
import { prisma, ADMIN_ROLES, isAdminRole, type AdminRole } from "@repo/database"
import { auth, requireCurrentAdmin, requireCurrentSuperAdmin } from "@/lib/auth"

export class AdminUserError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AdminUserError"
    }
}

function generatePassword(): string {
    return randomBytes(18).toString("base64url")
}

export class AdminUserService {
    static async list() {
        await requireCurrentAdmin()
        const [admins, customers] = await Promise.all([
            prisma.user.findMany({
                where: { role: { in: [...ADMIN_ROLES] } },
                orderBy: [{ role: "asc" }, { createdAt: "asc" }],
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    createdAt: true,
                    _count: { select: { sessions: true } },
                },
            }),
            prisma.user.count({ where: { role: "CUSTOMER" } }),
        ])
        return { admins, customers }
    }

    static async create(input: { email: string; name: string; role: AdminRole }) {
        const actor = await requireCurrentSuperAdmin()

        const email = input.email.trim().toLowerCase()
        const name = input.name.trim()
        if (!email.includes("@")) throw new AdminUserError(`"${input.email}" is not an email address.`)
        if (!name) throw new AdminUserError("An administrator needs a name.")
        if (!isAdminRole(input.role)) throw new AdminUserError(`${input.role} is not an administrator role.`)

        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })
        if (existing) {
            throw new AdminUserError(
                existing.role === "CUSTOMER"
                    ? `${email} already has a customer account. Promote it instead of creating a second one.`
                    : `${email} is already an administrator.`
            )
        }

        const password = generatePassword()
        const hash = await auth.$context.then((context) => context.password.hash(password))

        const user = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: { email, name, role: input.role, emailVerified: true },
                select: { id: true, email: true },
            })
            await tx.account.create({
                data: { userId: created.id, accountId: created.id, providerId: "credential", password: hash },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: actor.id,
                    actorEmail: actor.email,
                    action: "admin.create",
                    entity: "User",
                    entityId: created.id,
                    diff: { email, role: input.role },
                },
            })
            return created
        })

        return { id: user.id, email: user.email, password }
    }

    static async setRole(userId: string, role: AdminRole | "CUSTOMER") {
        const actor = await requireCurrentSuperAdmin()

        if (userId === actor.id) {
            throw new AdminUserError(
                "You cannot change your own role. Ask another SUPER_ADMIN — this is the fastest way to lock yourself out."
            )
        }

        const target = await prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { id: true, email: true, role: true },
        })

        const losingSuperAdmin = target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN"
        if (losingSuperAdmin) {
            const remaining = await prisma.user.count({
                where: { role: "SUPER_ADMIN", NOT: { id: userId } },
            })
            if (remaining === 0) {
                throw new AdminUserError(
                    "This is the last SUPER_ADMIN. Promote someone else first — otherwise the only way back in is the seed script and a database URL."
                )
            }
        }

        const demoted = role === "CUSTOMER" || (target.role === "SUPER_ADMIN" && role === "ADMIN")

        await prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id: userId }, data: { role } })
            if (demoted) {
                await tx.session.deleteMany({ where: { userId } })
            }
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: actor.id,
                    actorEmail: actor.email,
                    action: role === "CUSTOMER" ? "admin.revoke" : "admin.set_role",
                    entity: "User",
                    entityId: userId,
                    diff: { email: target.email, from: target.role, to: role, sessionsRevoked: demoted },
                },
            })
        })

        return { demoted }
    }

    static async revokeSessions(userId: string) {
        const actor = await requireCurrentSuperAdmin()
        const target = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } })

        const { count } = await prisma.session.deleteMany({ where: { userId } })
        await prisma.adminAuditLog.create({
            data: {
                actorType: "ADMIN",
                actorId: actor.id,
                actorEmail: actor.email,
                action: "admin.revoke_sessions",
                entity: "User",
                entityId: userId,
                diff: { email: target.email, sessions: count },
            },
        })
        return { count }
    }
}
