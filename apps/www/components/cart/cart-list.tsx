"use client"

import { useOptimistic, useTransition } from "react"
import Image from "@/components/app-image"
import { useLocale, useTranslations } from "next-intl"
import { Minus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatMoney, multiplyMoney, serializeMoney } from "@repo/database"

import { removeFromCart, updateCartItemQuantity } from "@/actions/cart"
import { DirectionalArrow } from "@/components/directional-arrow"
import { PriceTag } from "@/components/price-tag"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { CartItem } from "@/types"

const MAX_QUANTITY = 99

type OptimisticAction = { type: "quantity"; id: string; quantity: number } | { type: "remove"; id: string }

/**
 * The cart's rows.
 *
 * The rows arrive from the server already priced; this component only edits them. Each change
 * is applied OPTIMISTICALLY and then handed to the server action, which revalidates `/cart` —
 * the page re-renders from the database and the optimistic copy is discarded. A failure toasts
 * and the discarded copy is the rollback; there is no second list to keep in sync.
 *
 * The line total is recomputed through the money helpers, not `price * quantity` on strings
 * (ADR 0001) — the same arithmetic the drawer does.
 */
export function CartList({ items }: { items: CartItem[] }) {
    const t = useTranslations("cart-page")
    const locale = useLocale()
    const [pending, startTransition] = useTransition()

    const [rows, apply] = useOptimistic(items, (current: CartItem[], action: OptimisticAction) => {
        if (action.type === "remove") return current.filter((item) => item.id !== action.id)
        return current.map((item) =>
            item.id === action.id
                ? {
                      ...item,
                      quantity: action.quantity,
                      totalPrice: serializeMoney(multiplyMoney(item.price, action.quantity)),
                  }
                : item
        )
    })

    const setQuantity = (item: CartItem, quantity: number) => {
        if (quantity < 1 || quantity > MAX_QUANTITY || quantity === item.quantity) return
        startTransition(async () => {
            apply({ type: "quantity", id: item.id, quantity })
            const result = await updateCartItemQuantity(item.id, quantity)
            if (!result.success) toast.error(t("updateFailed"))
        })
    }

    const remove = (item: CartItem) => {
        startTransition(async () => {
            apply({ type: "remove", id: item.id })
            const result = await removeFromCart(item.id)
            if (!result.success) toast.error(t("removeFailed"))
            else toast.success(t("removed"))
        })
    }

    return (
        <ul className={cn("space-y-4", pending && "[&_button]:cursor-progress")} aria-busy={pending}>
            {rows.map((item) => (
                <li key={item.id} className="flex gap-4 rounded-lg border bg-card p-4 sm:gap-6 sm:p-5">
                    <Link
                        href={`/preview/${item.productId}`}
                        className="relative size-24 shrink-0 overflow-hidden rounded-md border bg-surface-sunk sm:size-28"
                    >
                        <Image
                            src={item.productImages[0] ?? "/placeholder.svg"}
                            alt=""
                            fill
                            sizes="112px"
                            className="object-cover"
                        />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    <bdi dir="auto">{item.subCategory}</bdi>
                                </p>
                                <h3 className="mt-0.5 truncate font-medium">
                                    <Link href={`/preview/${item.productId}`} className="hover:underline underline-offset-4">
                                        <bdi dir="auto">{item.productName}</bdi>
                                    </Link>
                                </h3>
                                {(item.selectedColorTemp || item.selectedColorKey) && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {[item.selectedColorTemp, item.selectedColorKey].filter(Boolean).join(" · ")}
                                    </p>
                                )}
                            </div>
                            <PriceTag price={item.price} basePrice={item.basePrice} size="sm" className="shrink-0 text-end" />
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {/* A stepper, not a free text field: the schema only accepts a
                                    positive integer, and a stepper cannot produce anything else. */}
                                <div
                                    role="group"
                                    aria-label={t("quantity")}
                                    className="inline-flex h-9 items-center rounded-md border"
                                >
                                    <button
                                        type="button"
                                        aria-label={t("decrease")}
                                        disabled={item.quantity <= 1}
                                        onClick={() => setQuantity(item, item.quantity - 1)}
                                        className="grid size-9 place-items-center rounded-s-md transition-colors duration-(--duration-fast) hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
                                    >
                                        <Minus aria-hidden className="size-3.5" />
                                    </button>
                                    <output className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
                                        {item.quantity}
                                    </output>
                                    <button
                                        type="button"
                                        aria-label={t("increase")}
                                        disabled={item.quantity >= MAX_QUANTITY}
                                        onClick={() => setQuantity(item, item.quantity + 1)}
                                        className="grid size-9 place-items-center rounded-e-md transition-colors duration-(--duration-fast) hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
                                    >
                                        <Plus aria-hidden className="size-3.5" />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => remove(item)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-accent hover:text-danger"
                                >
                                    <Trash2 aria-hidden className="size-4" />
                                    <span className="hidden sm:inline">{t("remove")}</span>
                                    <span className="sr-only sm:hidden">{t("remove")}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium tabular-nums">
                                    {formatMoney(item.totalPrice, locale)}
                                </span>
                                <Button asChild size="sm" className="group">
                                    <Link href={`/preview/${item.productId}`}>
                                        {t("orderNow")}
                                        <DirectionalArrow />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    )
}
