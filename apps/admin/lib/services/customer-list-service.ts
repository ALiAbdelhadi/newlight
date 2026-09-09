import { OrderStatus, Prisma, prisma, serializeMoney, type SerializedMoney } from "@repo/database"

import { toPrismaPage, type TableState } from "@/lib/table-params"

export const CUSTOMER_SORT_COLUMNS = ["name", "orders", "spend", "createdAt"] as const
export type CustomerSortColumn = (typeof CUSTOMER_SORT_COLUMNS)[number]

export interface CustomerRow {
    id: string
    name: string
    email: string
    phone: string | null
    city: string | null
    address: string | null
    orders: number
    spend: SerializedMoney
    lastOrderAt: string | null
    createdAt: string
}

export interface CustomerListResult {
    rows: CustomerRow[]
    total: number
}

function buildWhere(state: TableState): Prisma.UserWhereInput {
    const { filters } = state
    const where: Prisma.UserWhereInput = { role: "CUSTOMER" }
    const and: Prisma.UserWhereInput[] = []

    const query = filters.q?.trim()
    if (query) {
        and.push({
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phoneNumber: { contains: query } },
                { shippingAddress: { fullName: { contains: query, mode: "insensitive" } } },
                { shippingAddress: { phone: { contains: query } } },
                { shippingAddress: { city: { contains: query, mode: "insensitive" } } },
            ],
        })
    }

    if (filters.orders === "with") and.push({ orders: { some: {} } })
    if (filters.orders === "without") and.push({ orders: { none: {} } })

    if (filters.address === "missing") and.push({ shippingAddress: null })

    if (and.length > 0) where.AND = and
    return where
}

function buildOrderBy(state: TableState): Prisma.UserOrderByWithRelationInput[] {
    switch (state.sort as CustomerSortColumn | null) {
        case "name":
            return [{ name: state.dir }]
        case "orders":
            return [{ orders: { _count: state.dir } }]
        case "createdAt":
            return [{ createdAt: state.dir }]
        case "spend":
        default:
            return [{ createdAt: "desc" }]
    }
}

export async function listCustomers(state: TableState): Promise<CustomerListResult> {
    const where = buildWhere(state)

    const total = await prisma.user.count({ where })
    const { skip, take } = toPrismaPage(state, total)

    const users = await prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(state),
        select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            shippingAddress: {
                select: { fullName: true, phone: true, addressLine1: true, city: true },
            },
            _count: { select: { orders: true } },
        },
    })

    const ids = users.map((user) => user.id)
    const aggregates = ids.length
        ? await prisma.order.groupBy({
              by: ["userId"],
              where: { userId: { in: ids }, status: { not: OrderStatus.cancelled } },
              _sum: { total: true },
              _max: { createdAt: true },
          })
        : []

    const byUser = new Map(aggregates.map((row) => [row.userId, row]))

    const rows: CustomerRow[] = users.map((user) => {
        const aggregate = byUser.get(user.id)
        return {
            id: user.id,
            name: user.name || user.shippingAddress?.fullName || user.email.split("@")[0]!,
            email: user.email,
            phone: user.phoneNumber ?? user.shippingAddress?.phone ?? null,
            city: user.shippingAddress?.city ?? null,
            address: user.shippingAddress?.addressLine1 ?? null,
            orders: user._count.orders,
            spend: serializeMoney(aggregate?._sum.total ?? 0),
            lastOrderAt: aggregate?._max.createdAt?.toISOString() ?? null,
            createdAt: user.createdAt.toISOString(),
        }
    })

    return { rows, total }
}
