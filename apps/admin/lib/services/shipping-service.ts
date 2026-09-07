import {
    prisma,
    money,
    serializeMoney,
    getShippingRates,
    shippingRateKey,
    SHIPPING_OPTIONS,
    DEFAULT_SHIPPING_RATES,
    type ShippingOption,
    type SerializedMoney,
} from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * §13.2: the sidebar's Shipping link pointed at a route that did not exist, and the three
 * delivery prices it would have edited were a literal inside the storefront's checkout.
 *
 * So this screen is two things the owner otherwise cannot do: change what delivery costs, and
 * see what is waiting to go out.
 */

export class ShippingError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ShippingError"
    }
}

export class ShippingService {
    static async rates(): Promise<Array<{ option: ShippingOption; amount: SerializedMoney; isDefault: boolean }>> {
        await requireCurrentAdmin()
        const rates = await getShippingRates(prisma)
        return SHIPPING_OPTIONS.map((option) => ({
            option,
            amount: serializeMoney(rates[option]),
            // Surfaced because "50.00" from a default and "50.00" someone typed are the same
            // number and different facts — the second survives a change to the defaults.
            isDefault: serializeMoney(rates[option]) === DEFAULT_SHIPPING_RATES[option],
        }))
    }

    static async setRate(option: ShippingOption, amount: string) {
        const admin = await requireCurrentAdmin()

        let parsed
        try {
            parsed = money(amount)
        } catch {
            throw new ShippingError(`"${amount}" is not an amount.`)
        }
        // Zero is legitimate — free delivery is a real offer. Negative is not.
        if (parsed.isNegative()) throw new ShippingError("A shipping rate cannot be negative.")

        const value = serializeMoney(parsed)
        const key = shippingRateKey(option)

        await prisma.$transaction(async (tx) => {
            const before = await tx.systemSetting.findUnique({ where: { key }, select: { value: true } })
            await tx.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "shipping.set_rate",
                    entity: "SystemSetting",
                    entityId: key,
                    diff: { option, from: before?.value ?? DEFAULT_SHIPPING_RATES[option], to: value },
                },
            })
        })

        // Checkout reads this on every order, but the storefront caches the pages that quote it.
        await revalidateStorefront({ kind: "all" })
        return value
    }

    /**
     * What is actually waiting to move. Orders only — a shipping screen that showed addresses
     * without orders would be a mailing list.
     */
    static async fulfilmentQueue(limit = 50) {
        await requireCurrentAdmin()

        const [awaiting, inTransit, counts] = await Promise.all([
            prisma.order.findMany({
                where: { status: "awaiting_shipment" },
                orderBy: { createdAt: "asc" }, // oldest first: this is a queue, not a feed.
                take: limit,
                select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    shippingOption: true,
                    shippingCost: true,
                    total: true,
                    shippingAddress: { select: { fullName: true, city: true, phone: true } },
                },
            }),
            prisma.order.findMany({
                where: { status: "shipped" },
                orderBy: { shippedAt: "asc" },
                take: limit,
                select: {
                    id: true,
                    orderNumber: true,
                    shippedAt: true,
                    trackingNumber: true,
                    shippingAddress: { select: { fullName: true, city: true } },
                },
            }),
            prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        ])

        return {
            awaiting: awaiting.map((o) => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
                shippingCost: serializeMoney(o.shippingCost),
                total: serializeMoney(o.total),
                // Oldest-first means the top row is the one that has waited longest; say how long.
                waitingDays: Math.floor((Date.now() - o.createdAt.getTime()) / 86_400_000),
            })),
            inTransit: inTransit.map((o) => ({
                ...o,
                shippedAt: o.shippedAt?.toISOString() ?? null,
            })),
            counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>,
        }
    }

    /** Where orders actually go — the input to any future per-city rate. */
    static async destinations(limit = 15) {
        await requireCurrentAdmin()
        return prisma.$queryRaw<Array<{ city: string; orders: bigint }>>`
            SELECT a.city, count(*) AS orders
              FROM orders o
              JOIN shipping_addresses a ON a.id = o."shippingAddressId"
             WHERE o.status <> 'cancelled'
             GROUP BY a.city
             ORDER BY count(*) DESC
             LIMIT ${limit}`
    }

    /**
     * §13.2: orders shipped under COD with no tracking number entered (F3). Not an error —
     * tracking is manual — but it is the list of parcels nobody can answer a question about.
     */
    static async shippedWithoutTracking() {
        await requireCurrentAdmin()
        return prisma.order.findMany({
            where: { status: "shipped", OR: [{ trackingNumber: null }, { trackingNumber: "" }] },
            orderBy: { shippedAt: "asc" },
            select: { id: true, orderNumber: true, shippedAt: true },
        })
    }
}
