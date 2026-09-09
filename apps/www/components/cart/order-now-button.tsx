"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { saveConfiguration } from "@/actions/configuration"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import type { CartItem } from "@/types"

// Checkout runs per product configuration, not per cart line: the preview page wants a
// configuration id. Linking the cart line straight to /preview/<sku> used to 404. This creates
// (or re-prices) the configuration from the line's product, options and quantity, then goes there.
export function OrderNowButton({ item, disabled }: { item: CartItem; disabled?: boolean }) {
    const t = useTranslations("cart-page")
    const router = useRouter()
    const [pending, start] = useTransition()

    const orderNow = () =>
        start(async () => {
            const result = await saveConfiguration({
                productId: item.productId,
                quantity: item.quantity,
                selectedColorTemp: item.selectedColorTemp ?? undefined,
                selectedColorKey: item.selectedColorKey ?? undefined,
            })
            if (result.success && result.configId) {
                router.push(`/preview/${result.configId}`)
            } else {
                toast.error(t("updateFailed"))
            }
        })

    return (
        <Button size="sm" className="group" onClick={orderNow} disabled={disabled || pending}>
            {t("orderNow")}
            <DirectionalArrow />
        </Button>
    )
}
