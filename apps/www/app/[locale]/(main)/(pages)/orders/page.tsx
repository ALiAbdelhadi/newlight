import { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import Image from "next/image"
import { resolveLocale } from "@repo/database"
import { Link } from "@/i18n/navigation"
import { currentUserId } from "@/lib/auth"
import { UserService } from "@/lib/services/user-service"
import { constructMetadata } from "@/lib/metadata"
import { Container } from "@/components/container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { SupportedLanguage } from "@/types"
import { CancelOrderButton } from "./cancel-order-button"

/**
 * The customer's order list.
 *
 * The header has linked to `/orders` all along and the route did not exist, so a customer
 * could reach an order only by keeping its URL. `getUserOrders` was written, paginated, and
 * called by nothing.
 *
 * Money arrives already serialised — `getOrderHistory` does it at the service boundary, which
 * is also where the unscoped `take: 1` on translations was fixed (§14.4).
 */
export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadatas.orders-page")
    const locale = (await getLocale()) as SupportedLanguage
    return constructMetadata({ title: t("title"), description: t("description"), locale })
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const userId = await currentUserId()
    // The proxy redirects a request with no session cookie, but a stale cookie reaches here.
    if (!userId) redirect("/sign-in")

    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("orders-page")
    const { page: pageParam } = await searchParams
    const page = Math.max(1, Number(pageParam ?? 1) || 1)

    const { orders, pagination } = await UserService.getOrderHistory(userId, locale, {
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
    })
    const totalPages = Math.max(1, Math.ceil(pagination.total / PAGE_SIZE))

    return (
        <div className="min-h-screen py-16">
            <Container>
                <header className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight">{t("heading")}</h1>
                    <p className="text-muted-foreground mt-2">{t("subheading", { count: pagination.total })}</p>
                </header>

                {orders.length === 0 ? (
                    <div className="border border-border rounded-sm bg-secondary/20 py-20 text-center">
                        <p className="text-muted-foreground text-lg font-light mb-6">{t("empty")}</p>
                        <Button asChild>
                            <Link href="/category">{t("emptyAction")}</Link>
                        </Button>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {orders.map((order) => (
                            <li key={order.id} className="border border-border rounded-sm p-5 bg-card">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-mono font-medium">{order.orderNumber}</span>
                                            <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>
                                                {t(`status.${order.status}`)}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t("placed")}{" "}
                                            <time dateTime={order.createdAt.toISOString()}>
                                                {order.createdAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
                                            </time>
                                            {" · "}
                                            {t("items", { count: order.items.length })}
                                        </p>
                                    </div>

                                    <div className="text-end">
                                        <p className="text-sm text-muted-foreground">{t("total")}</p>
                                        <p className="text-xl font-medium tabular-nums">{order.total}</p>
                                    </div>
                                </div>

                                {/* The photographs are what a customer recognises an order by — the
                                    order number is what WE call it. */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {order.items.slice(0, 5).map((item) =>
                                        item.product.image ? (
                                            <Image
                                                key={item.id}
                                                src={item.product.image}
                                                alt={item.product.name}
                                                width={56}
                                                height={56}
                                                className="rounded-sm border object-cover h-14 w-14"
                                            />
                                        ) : null
                                    )}
                                    {order.items.length > 5 && (
                                        <span className="h-14 w-14 rounded-sm border grid place-items-center text-sm text-muted-foreground">
                                            +{order.items.length - 5}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 mt-5">
                                    <Button variant="secondary" asChild>
                                        <Link href={`/orders/${order.id}`}>{t("view")}</Link>
                                    </Button>
                                    {/* Only before it ships. The server decides that too — this is
                                        which button to draw, not whether the rule holds. */}
                                    {order.status === "awaiting_shipment" && (
                                        <CancelOrderButton
                                            orderId={order.id}
                                            orderNumber={order.orderNumber}
                                            labels={{
                                                cancel: t("cancel"),
                                                cancelling: t("cancelling"),
                                                title: t("cancelTitle", { orderNumber: order.orderNumber }),
                                                body: t("cancelBody"),
                                                confirm: t("cancelConfirm"),
                                                keep: t("cancelKeep"),
                                                done: t("cancelled"),
                                                failed: t("cancelFailed"),
                                            }}
                                        />
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {totalPages > 1 && (
                    <nav className="flex items-center justify-between mt-8" aria-label={t("heading")}>
                        <Button variant="secondary" disabled={page <= 1} asChild={page > 1}>
                            {page > 1 ? <Link href={`/orders?page=${page - 1}`}>{t("previous")}</Link> : <span>{t("previous")}</span>}
                        </Button>
                        <span className="text-sm text-muted-foreground tabular-nums">
                            {t("page", { page, total: totalPages })}
                        </span>
                        <Button variant="secondary" disabled={page >= totalPages} asChild={page < totalPages}>
                            {page < totalPages ? <Link href={`/orders?page=${page + 1}`}>{t("next")}</Link> : <span>{t("next")}</span>}
                        </Button>
                    </nav>
                )}
            </Container>
        </div>
    )
}
