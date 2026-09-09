import { createPrismaClient } from "../prisma-client"

// One-off pre-launch clean-up. Removes the rows that only ever existed to try the system out:
//   - the "VERIFY — …" discount (a live 15% test discount on Indoor Lighting)
//   - the migrated placeholder customer, their empty cancelled orders and their address
//   - every saved product configuration and cart (all pre-launch test baskets)
//   - the admin audit log (all entries are from testing sessions)
//   - rate-limit counters
// Catalogue, taxonomy, specifications, colours, families, administrators, stock levels and
// settings are not touched. Run with --dry to see the counts without deleting anything.

const prisma = createPrismaClient()
const dry = process.argv.includes("--dry")

async function main() {
    const migrated = await prisma.user.findMany({
        where: { email: { startsWith: "migrated-" }, role: "CUSTOMER" },
        select: { id: true, email: true },
    })
    const migratedIds = migrated.map((u) => u.id)

    const counts = {
        "VERIFY discounts": await prisma.discount.count({ where: { name: { startsWith: "VERIFY" } } }),
        "discount products": await prisma.discountProduct.count(),
        "orders of migrated customers": await prisma.order.count({ where: { userId: { in: migratedIds } } }),
        "order items of those orders": await prisma.orderItem.count({ where: { order: { userId: { in: migratedIds } } } }),
        "cart items": await prisma.cartItem.count(),
        carts: await prisma.cart.count(),
        "product configurations": await prisma.productConfiguration.count(),
        "shipping addresses of migrated customers": await prisma.shippingAddress.count({ where: { userId: { in: migratedIds } } }),
        "migrated customers": migrated.length,
        "audit log rows": await prisma.adminAuditLog.count(),
        "rate-limit rows": await prisma.rateLimit.count(),
    }

    console.log(dry ? "[purge] DRY RUN — nothing will be deleted" : "[purge] deleting…")
    for (const [label, count] of Object.entries(counts)) console.log(`[purge]   ${label}: ${count}`)
    for (const u of migrated) console.log(`[purge]   migrated customer: ${u.email}`)
    if (dry) return

    await prisma.$transaction(async (tx) => {
        await tx.discountProduct.deleteMany({})
        await tx.discount.deleteMany({ where: { name: { startsWith: "VERIFY" } } })
        await tx.orderItem.deleteMany({ where: { order: { userId: { in: migratedIds } } } })
        await tx.order.deleteMany({ where: { userId: { in: migratedIds } } })
        await tx.cartItem.deleteMany({})
        await tx.cart.deleteMany({})
        await tx.productConfiguration.deleteMany({})
        await tx.shippingAddress.deleteMany({ where: { userId: { in: migratedIds } } })
        await tx.user.deleteMany({ where: { id: { in: migratedIds } } })
        await tx.adminAuditLog.deleteMany({})
        await tx.rateLimit.deleteMany({})
    })

    console.log("[purge] done. Remaining:")
    console.log(
        JSON.stringify(
            {
                users: await prisma.user.findMany({ select: { email: true, role: true } }),
                orders: await prisma.order.count(),
                discounts: await prisma.discount.count(),
                configurations: await prisma.productConfiguration.count(),
                auditRows: await prisma.adminAuditLog.count(),
                products: await prisma.product.count(),
                categories: await prisma.category.count(),
                subCategories: await prisma.subCategory.count(),
                stockLevels: await prisma.stockLevel.count(),
            },
            null,
            2
        )
    )
    console.log("[purge] The storefront caches prices; call the revalidate endpoint (or wait for the timer) so the removed discount stops showing.")
}

main()
    .catch((error) => {
        console.error(`[purge] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
