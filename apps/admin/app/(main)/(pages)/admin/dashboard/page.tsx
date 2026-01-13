import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/database";
import { notFound } from "next/navigation";
import DashboardClient from "@/components/dashboard";

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return notFound();
    }


    if (user.emailAddresses[0].emailAddress !== process.env.ADMIN_EMAIL) {
        return notFound();
    }

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
            productPrice: item.price,
            quantity: item.quantity,
            shippingPrice: order.shippingCost / order.items.length,
            discountRate: order.configuration?.discount || 0,
            totalPrice: (item.price * item.quantity) + (order.shippingCost / order.items.length),
            status: (order.status === "fulfilled" || order.status === "delivered" || order.status === "shipped") ? "fulfilled" as const :
                (order.status === "cancelled" || order.status === "refunded") ? "cancelled" as const :
                    order.status === "processing" ? "processing" as const :
                        "awaiting_shipment" as const,
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