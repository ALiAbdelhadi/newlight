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
import { createPageCanonicalUrl } from "@/lib/canonical-url"
import { CartService } from "@/lib/services/cart-service"
import { cartTotals, formatCartItem } from "@/lib/services/cart-view"
import { cheapestShippingRate, shippingRates } from "@/lib/services/shipping-service"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadatas.cart-page")
    const locale = resolveLocale(await getLocale())
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale,
        canonicalUrl: createPageCanonicalUrl({ locale, path: "cart" }),
        // Requires sign-in (see the redirect below) and is different for every visitor.
        noIndex: true,
    })
}

export default async function CartPage() {
    const userId = await currentUserId()
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
