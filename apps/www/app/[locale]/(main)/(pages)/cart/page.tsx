import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { formatMoney, isZeroMoney, resolveLocale } from "@repo/database"

import { CartList } from "@/components/cart/cart-list"
import { ClearCartButton } from "@/components/cart/clear-cart-button"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, PageHeader } from "@/components/layout/section"
import { EmptyState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { currentUserId } from "@/lib/auth"
import { activeDiscounts } from "@/lib/discounts"
import { constructMetadata } from "@/lib/metadata"
import { CartService } from "@/lib/services/cart-service"
import { cartTotals, formatCartItem } from "@/lib/services/cart-view"
import { cheapestShippingRate, shippingRates } from "@/lib/services/shipping-service"

/**
 * The cart, as a page.
 *
 * `actions/cart.ts` has called `revalidatePath("/cart")` after every mutation since it was
 * written, for a route that did not exist. The only cart the storefront had was the drawer in
 * the header: fine for glancing at three lines, wrong for comparing six, and impossible to
 * link to, share, or come back to after signing in.
 *
 * A SERVER COMPONENT reading the cart straight from `CartService` — no client fetch on mount,
 * no spinner, no "Loading cart…" flash — through the same `formatCartItem` the drawer's API
 * uses, so the two never disagree about a price. Quantity changes and removals go through the
 * existing server actions, which revalidate this path and hand the page back fresh.
 *
 * WHAT IT DOES NOT HAVE, deliberately: a "Checkout" button. An order in this system is created
 * from ONE product's configuration (`createOrderFromConfiguration`); there is no order-from-
 * cart path in the backend, and a button that gathered six lines into a form that could only
 * submit one would be the fake feature the capability rule forbids. Each line keeps the
 * drawer's "Order now", which is the path that exists. Cart-wide checkout stays DEFERRED until
 * the order model supports it.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadatas.cart-page")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({ title: t("title"), description: t("description"), locale })
}

export default async function CartPage() {
    const userId = await currentUserId()
    // The proxy redirects a request with no session cookie, but a stale cookie reaches here.
    if (!userId) redirect("/sign-in")

    const locale = resolveLocale(await getLocale())
    const [t, ts] = await Promise.all([getTranslations("cart-page"), getTranslations("shipping")])

    const [cart, discounts, rates] = await Promise.all([
        CartService.getCartWithItems(userId, locale),
        activeDiscounts(),
        shippingRates(),
    ])
    const items = (cart?.items ?? []).map((item) => formatCartItem(item, discounts))
    const totals = cartTotals(items)

    return (
        <>
            <PageHeader
                eyebrow={t("eyebrow")}
                title={t("heading")}
                description={t("subheading", { count: totals.units })}
                action={items.length > 0 ? <ClearCartButton label={t("clear")} confirm={t("clearConfirm")} /> : undefined}
            />

            <Container className="py-10 lg:py-14">
                {items.length === 0 ? (
                    /* `no-data`: nothing is filtered, the cart is genuinely empty, and the
                       next action is the catalogue. */
                    <EmptyState
                        variant="no-data"
                        title={t("emptyTitle")}
                        description={t("emptyBody")}
                        action={
                            <Button asChild size="lg" className="group">
                                <Link href="/category">
                                    {t("browse")}
                                    <DirectionalArrow />
                                </Link>
                            </Button>
                        }
                        className="rounded-lg border bg-surface-sunk"
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_20rem] lg:items-start xl:grid-cols-[1fr_22rem]">
                        <CartList items={items} />

                        {/* Sticky under the header on wide screens; a plain block after the
                            list on narrow ones, where a sticky panel would eat the viewport. */}
                        <aside
                            aria-labelledby="cart-summary"
                            className="rounded-lg border bg-card p-6 lg:sticky lg:top-[calc(var(--header-height)+var(--announcement-height)+1.5rem)]"
                        >
                            <h2 id="cart-summary" className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                                {t("summary")}
                            </h2>
                            <dl className="mt-5 space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-muted-foreground">{t("subtotal")}</dt>
                                    <dd className="tabular-nums">{formatMoney(totals.subtotal, locale)}</dd>
                                </div>
                                {!isZeroMoney(totals.discount) && (
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-muted-foreground">{t("discount")}</dt>
                                        <dd className="tabular-nums text-danger">−{formatMoney(totals.discount, locale)}</dd>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-muted-foreground">{t("shipping")}</dt>
                                    {/*
                                     * A FLOOR, not a guess. The option is chosen at checkout, so
                                     * the cart cannot name the price — but "calculated at
                                     * checkout" tells a customer to find out by starting an
                                     * order. The cheapest stored rate is true whatever they pick.
                                     */}
                                    <dd className="text-end tabular-nums text-muted-foreground">
                                        {t("shippingFrom", { amount: formatMoney(cheapestShippingRate(rates), locale) })}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t pt-3">
                                    <dt className="font-medium">{t("total")}</dt>
                                    <dd className="text-end">
                                        <span className="block text-xl font-semibold tabular-nums">
                                            {formatMoney(totals.total, locale)}
                                        </span>
                                        <span className="block text-xs font-normal text-muted-foreground">
                                            {t("beforeShipping")}
                                        </span>
                                    </dd>
                                </div>
                            </dl>

                            {/* The "from" above is a Cairo/Giza price. Saying so here keeps the
                                condition with the number rather than on a policy page. */}
                            <p className="mt-4 text-xs text-pretty text-muted-foreground">{ts("cartNote")}</p>

                            <p className="mt-5 text-sm text-pretty text-muted-foreground">{t("howToOrder")}</p>

                            <Button asChild variant="outline" size="lg" className="group mt-6 w-full">
                                <Link href="/category">
                                    {t("continue")}
                                    <DirectionalArrow />
                                </Link>
                            </Button>
                        </aside>
                    </div>
                )}
            </Container>
        </>
    )
}
