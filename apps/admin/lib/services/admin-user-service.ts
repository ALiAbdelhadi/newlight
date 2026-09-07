import { randomBytes } from "node:crypto"
import { prisma, ADMIN_ROLES, isAdminRole, type AdminRole } from "@repo/database"
import { auth, requireCurrentAdmin, requireCurrentSuperAdmin } from "@/lib/auth"

/**
 * Administrators.
 *
 * `seed-super-admin.ts` says "every administrator after that is created by an existing
 * SUPER_ADMIN through the panel". That panel did not exist, so the only way to add one was to
 * run a script with database access — and there was no way at all to demote or lock out an
 * administrator who left.
 *
 * Everything here is SUPER_ADMIN only. That is also the first time this project has had two
 * levels of administrator that mean anything: until now every admin could do everything, and
 * the distinction existed in the schema and nowhere else.
 *
 * Two guards matter more than the features:
 *
 *   YOU CANNOT CHANGE YOUR OWN ROLE. Demoting yourself is a locked door with the key inside,
 *   and it is the single most likely way to lose access to this panel entirely.
 *
 *   THE LAST SUPER_ADMIN CANNOT BE DEMOTED OR REMOVED. Not because it is untidy, but because
 *   the only recovery is the seed script and a database URL.
 */

export class AdminUserError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AdminUserError"
    }
}

/** Not memorable on purpose: it is meant to be handed over once and replaced. */
function generatePassword(): string {
    return randomBytes(18).toString("base64url")
}

export class AdminUserService {
    /** Anyone signed in may SEE who the administrators are; changing them is another matter. */
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

    /**
     * Create an administrator, and return the password ONCE.
     *
     * An emailed invitation would be better and is not possible yet: `RESEND_API_KEY` is unset,
     * so an invitation would go to the outbox and never arrive, and the new administrator would
     * be waiting for something that is not coming. Handing the password to the person who
     * created the account is honest about that. When the sending domain is verified this
     * becomes a reset link and the password stops existing.
     */
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
        // Hashed through Better Auth's own context, so the stored hash is whatever Better Auth
        // expects to verify. Reimplementing scrypt here would work until it silently did not.
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
                    // The password is NOT recorded. An audit log that contains credentials is a
                    // credential store nobody meant to build.
                    diff: { email, role: input.role },
                },
            })
            return created
        })

        return { id: user.id, email: user.email, password }
    }

    /**
     * Promote, demote, or remove administrator access entirely (`CUSTOMER`).
     *
     * Sessions are revoked on any demotion. Whether Better Auth would notice the role change on
     * its own depends on how it caches a session, and "probably" is not a good enough answer
     * for someone who has just been removed — deleting the rows makes it true either way.
     */
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

    /** Sign someone out of every device, without changing what they are allowed to do. */
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
