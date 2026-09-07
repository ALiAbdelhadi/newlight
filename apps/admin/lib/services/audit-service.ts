import { prisma, type Prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"

/**
 * Reading the audit log.
 *
 * Every price change, translation save, spec edit, image upload, archive, role change and order
 * transition in this system writes a row here with who did it and when. Nothing displayed any
 * of it — the one place it surfaced was a single product's price history, reading its own
 * narrow slice with a hand-written `jsonb_array_elements`.
 *
 * A log nobody can read is a log that only proves things after an incident, to whoever has
 * database access. This makes it answerable from the panel: what happened, to what, by whom.
 */

export interface AuditFilters {
    action?: string
    entity?: string
    entityId?: string
    actorEmail?: string
    /** Free text over the action and the entity id — the two things people actually remember. */
    search?: string
    page?: number
}

export const AUDIT_PAGE_SIZE = 50

export class AuditService {
    /**
     * The distinct values worth filtering by, taken from the data rather than a hard-coded list.
     *
     * Actions are formed by template in places (`order.shipped->delivered`, `${kind}.restore`),
     * so any list written by hand here would be wrong the first time someone adds a transition.
     */
    static async facets() {
        await requireCurrentAdmin()
        const [actions, entities, actors] = await Promise.all([
            prisma.adminAuditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
            prisma.adminAuditLog.groupBy({ by: ["entity"], _count: { _all: true }, orderBy: { entity: "asc" } }),
            prisma.adminAuditLog.groupBy({
                by: ["actorEmail"],
                _count: { _all: true },
                where: { actorEmail: { not: null } },
                orderBy: { actorEmail: "asc" },
            }),
        ])
        return {
            actions: actions.map((a) => ({ value: a.action, count: a._count._all })),
            entities: entities.map((e) => ({ value: e.entity, count: e._count._all })),
            actors: actors.map((a) => ({ value: a.actorEmail!, count: a._count._all })),
        }
    }

    static async list(filters: AuditFilters = {}) {
        await requireCurrentAdmin()
        const page = Math.max(1, filters.page ?? 1)

        const where: Prisma.AdminAuditLogWhereInput = {
            ...(filters.action ? { action: filters.action } : {}),
            ...(filters.entity ? { entity: filters.entity } : {}),
            ...(filters.entityId ? { entityId: filters.entityId } : {}),
            ...(filters.actorEmail ? { actorEmail: filters.actorEmail } : {}),
            ...(filters.search
                ? {
                      OR: [
                          { action: { contains: filters.search, mode: "insensitive" } },
                          { entityId: { contains: filters.search, mode: "insensitive" } },
                          { actorEmail: { contains: filters.search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        }

        const [rows, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                // Newest first, with `id` as the tiebreak: two rows written inside one
                // transaction share a timestamp to the millisecond, and an unordered tie makes
                // "the first 50" a different fifty each time (A74).
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                skip: (page - 1) * AUDIT_PAGE_SIZE,
                take: AUDIT_PAGE_SIZE,
            }),
            prisma.adminAuditLog.count({ where }),
        ])

        return {
            rows: rows.map((row) => ({
                ...row,
                createdAt: row.createdAt.toISOString(),
            })),
            total,
            page,
            totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
        }
    }

    /**
     * Everything that has happened to one thing.
     *
     * `@@index([entity, entityId, createdAt])` exists for exactly this query, and it is the
     * question people ask most often: not "what happened today" but "who changed THIS".
     */
    static async forEntity(entity: string, entityId: string, limit = 100) {
        await requireCurrentAdmin()
        const rows = await prisma.adminAuditLog.findMany({
            where: { entity, entityId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit,
        })
        return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    }

    /** Enough to say "23 changes today, by two people" without loading them. */
    static async summary() {
        await requireCurrentAdmin()
        const since = new Date(Date.now() - 24 * 3_600_000)
        const [today, week, actors] = await Promise.all([
            prisma.adminAuditLog.count({ where: { createdAt: { gte: since } } }),
            prisma.adminAuditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3_600_000) } } }),
            prisma.adminAuditLog.groupBy({
                by: ["actorEmail"],
                where: { createdAt: { gte: since }, actorEmail: { not: null } },
            }),
        ])
        return { today, week, actorsToday: actors.length }
    }
}
