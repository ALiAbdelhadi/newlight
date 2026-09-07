import { currentAdmin, currentAdminId, requireCurrentAdmin } from "@/lib/auth"
import { prisma , addMoney, divideMoney, multiplyMoney, serializeMoney } from "@repo/database";
import { notFound } from "next/navigation";
import DashboardClient from "@/components/dashboard";

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  // One guard, replacing the signed-in check plus the ADMIN_EMAIL comparison.
  const admin = await requireCurrentAdmin();
  const userId = admin.id;

    // Fetch all orders from database (no date filter - all orders)
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    preferredLanguage: true,
                    preferredCurrency: true,
                },
            },
            shippingAddress: true,
            items: {
                include: {
                    product: {
                        include: {
                            translations: {
                                take: 1,
                            },
                        },
                    },
                    configuration: true,
                },
            },
            configuration: true,
        },
    });

    const flattenedOrders = orders.flatMap((order) => {
        const customerName = order.shippingAddress?.fullName ||
            order.user.email?.split("@")[0] ||
            "Unknown Customer"
        const customerEmail = order.shippingAddress?.email ||
            order.user.email ||
            "no-email@example.com"

        return order.items.map((item) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName,
            customerEmail,
            customerAvatar: "",
            productName: item.productName,
            productImage: item.productImage || "/placeholder-product.png",
            productPrice: serializeMoney(item.price),
            quantity: item.quantity,
            // Shipping apportioned across the lines in Decimal, then serialised once.
            shippingPrice: serializeMoney(divideMoney(order.shippingCost, order.items.length)),
            totalPrice: serializeMoney(
                addMoney(multiplyMoney(item.price, item.quantity), divideMoney(order.shippingCost, order.items.length))
            ),
            // The status is the status. v1 mapped delivered and shipped onto `fulfilled`,
            // a value 0010 removed, which lost the distinction between the two.
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            user: {
                id: order.user.id,
                email: order.user.email,
                phoneNumber: order.user.phoneNumber,
                preferredLanguage: order.user.preferredLanguage,
                preferredCurrency: order.user.preferredCurrency,
            }
        }))
    });

    return <DashboardClient initialOrders={flattenedOrders} />
}