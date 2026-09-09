import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import Image from "@/components/app-image"
import { formatMoney, resolveLocale, serializeMoney } from "@repo/database"

import { AddressCard } from "@/components/account/address-card"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, PageHeader } from "@/components/layout/section"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { currentUserId } from "@/lib/auth"
import { formatDate } from "@/lib/date"
import { constructMetadata } from "@/lib/metadata"
import { UserService } from "@/lib/services/user-service"

/**
 * The customer's account.
 *
 * The header's account menu had one entry, "My orders", because the order list was the only
 * account surface that existed. The shipping address — which `UserService` could read, save
 * and delete since P2 — was editable in exactly one place: the middle of a checkout, where
 * changing it meant starting an order to get to the form.
 *
 * This page is the hub those three things were missing: who you are, where we deliver, and
 * what you have ordered. Each card is one service call, and nothing on it is invented:
 *
 *   PROFILE is read-only. Better Auth owns the name and email and the storefront exposes no
 *   mutation for either, so there is no "Edit" button here pretending otherwise.
 *   ADDRESS is the full read/save/delete the service supports, through session-scoped actions.
 *   ORDERS is the real count and spend, plus the three most recent, linking to the list.
 */
export const dynamic = "force-dynamic"

const RECENT_ORDERS = 3

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadatas.account-page")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({ title: t("title"), description: t("description"), locale })
}

export default async function AccountPage() {
    const userId = await currentUserId()
    if (!userId) redirect("/sign-in")

    const locale = resolveLocale(await getLocale())
    const t = await getTranslations("account")

    const [user, stats, history] = await Promise.all([
        UserService.getUserWithAddress(userId),
        UserService.getUserStats(userId),
        UserService.getOrderHistory(userId, locale, { skip: 0, take: RECENT_ORDERS }),
    ])
    if (!user) redirect("/sign-in")

    // `_sum.total` is a Decimal (or 0 with no orders); it is formatted here and never crosses
    // into a client component (ADR 0001).
    const totalSpent = formatMoney(serializeMoney(stats.totalSpent), locale)
    const displayName = user.name?.trim() || user.email

    return (
        <>
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("heading", { name: displayName })}
                description={t("subheading")}
            />

            <Container className="py-10 lg:py-14">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* ---------------------------------------------------------- profile */}
                    <section aria-labelledby="account-profile" className="rounded-lg border bg-card p-6">
                        <h2 id="account-profile" className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                            {t("profile.title")}
                        </h2>
                        <dl className="mt-5 space-y-4 text-sm">
                            <div>
                                <dt className="text-muted-foreground">{t("profile.name")}</dt>
                                <dd className="mt-0.5 font-medium">
                                    <bdi dir="auto">{user.name?.trim() || "—"}</bdi>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t("profile.email")}</dt>
                                <dd className="mt-0.5 truncate font-medium" dir="ltr">
                                    {user.email}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">{t("profile.since")}</dt>
                                <dd className="mt-0.5 font-medium">
                                    <time dateTime={user.createdAt.toISOString()}>{formatDate(user.createdAt, locale)}</time>
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-6 text-sm text-pretty text-muted-foreground">{t("profile.readOnly")}</p>
                    </section>

                    {/* ---------------------------------------------------------- address */}
                    <AddressCard address={user.shippingAddress} email={user.email} />

                    {/* ----------------------------------------------------------- orders */}
                    <section aria-labelledby="account-orders" className="rounded-lg border bg-card p-6">
                        <div className="flex items-start justify-between gap-4">
                            <h2 id="account-orders" className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                                {t("orders.title")}
                            </h2>
                            {stats.orderCount > 0 && (
                                <Link
                                    href="/orders"
                                    className="group inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    {t("orders.all")}
                                    <DirectionalArrow />
                                </Link>
                            )}
                        </div>

                        <dl className="mt-5 grid grid-cols-2 gap-4">
                            <div className="rounded-md bg-surface-sunk p-4">
                                <dt className="text-xs text-muted-foreground">{t("orders.count")}</dt>
                                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.orderCount}</dd>
                            </div>
                            <div className="rounded-md bg-surface-sunk p-4">
                                <dt className="text-xs text-muted-foreground">{t("orders.spent")}</dt>
                                <dd className="mt-1 text-2xl font-semibold tabular-nums">{totalSpent}</dd>
                            </div>
                        </dl>

                        {history.orders.length === 0 ? (
                            <div className="mt-6">
                                <p className="text-sm text-pretty text-muted-foreground">{t("orders.empty")}</p>
                                <Button asChild size="sm" className="group mt-4">
                                    <Link href="/category">
                                        {t("orders.browse")}
                                        <DirectionalArrow />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <ul className="mt-6 divide-y">
                                {history.orders.map((order) => (
                                    <li key={order.id}>
                                        <Link
                                            href={`/orders/${order.id}`}
                                            className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors duration-(--duration-fast) hover:bg-accent"
                                        >
                                            {order.items[0]?.product.image ? (
                                                <Image
                                                    src={order.items[0].product.image}
                                                    alt=""
                                                    width={40}
                                                    height={40}
                                                    className="size-10 shrink-0 rounded-md border bg-surface-sunk object-contain"
                                                />
                                            ) : (
                                                <span aria-hidden className="size-10 shrink-0 rounded-md border bg-surface-sunk" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate font-mono text-sm font-medium">{order.orderNumber}</span>
                                                    <StatusBadge kind="order" value={order.status} locale={locale} />
                                                </span>
                                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                                    <time dateTime={order.createdAt.toISOString()}>{formatDate(order.createdAt, locale)}</time>
                                                    {" · "}
                                                    {formatMoney(order.total, locale)}
                                                </span>
                                            </span>
                                            <DirectionalArrow />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </Container>
        </>
    )
}
