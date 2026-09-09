import { OrderStatus, Prisma, prisma, serializeMoney, type SerializedMoney } from "@repo/database"

import { toPrismaPage, type TableState } from "@/lib/table-params"

/**
 * The Customers list query (P4.5 §11, §25).
 *
 * The same contract as `product-list-service`, for the same reasons — and this surface needed
 * it more urgently than Products did. What it replaces:
 *
 *   AN UNBOUNDED QUERY. `prisma.user.findMany({ include: { shippingAddress: true, orders: …
 *   } })` — every customer, with every order each of them has ever placed, on every render.
 *   No `take`, no `skip`, no `where`. At a thousand customers that is a thousand rows and
 *   their whole order history serialised into the client bundle so that a column could print
 *   `orders.length`.
 *
 *   SEARCH THAT ONLY SAW ONE PAGE. The filter ran in the browser over whatever had been
 *   fetched. It felt instant and it was answering a different question from the one asked:
 *   "no customers found" meant "not in this array", never "not in the database".
 *
 *   DECIMALS ACROSS THE BOUNDARY. `total: Prisma.Decimal` was handed to a client component,
 *   which is the defect ADR 0001 exists to stop. Money is serialized here, once.
 *
 * Lifetime value counts everything except cancelled orders — a cancelled order is not revenue,
 * and summing it would make the most cancelled customer look like the best one.
 */

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
    /** Excludes cancelled orders. */
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

    // "Has ordered" is a real operational split: a customer who has never ordered is a lead.
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
            /*
             * Spend cannot be ordered by in SQL here — it is a filtered sum over a relation,
             * which Prisma has no `orderBy` for. Falling back to newest-first is honest;
             * ordering the page by a value computed after paging would sort fifty rows and
             * present it as an answer about every customer, which is exactly the defect the
             * old Products "Sold" tab shipped.
             */
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

    /*
     * Spend and last-order date come from ONE aggregate over the page's user ids, not from
     * including every customer's order history in the row query. Fifty customers with forty
     * orders each is two thousand rows fetched to produce fifty sums, and every one of them
     * carried a Decimal that then had to cross into the client.
     */
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
            // The account's own name first: the shipping name is whoever the parcel is
            // addressed to, which is often somebody else in the same household.
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
