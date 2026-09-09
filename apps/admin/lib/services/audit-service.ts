import { prisma, type Prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"

export interface AuditFilters {
    action?: string
    entity?: string
    entityId?: string
    actorEmail?: string
    search?: string
    page?: number
}

export const AUDIT_PAGE_SIZE = 50

export class AuditService {
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

    static async forEntity(entity: string, entityId: string, limit = 100) {
        await requireCurrentAdmin()
        const rows = await prisma.adminAuditLog.findMany({
            where: { entity, entityId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit,
        })
        return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    }

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
