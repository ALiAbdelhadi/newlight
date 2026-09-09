import { MapPin } from "lucide-react"
import type { ShippingAddress } from "@repo/database"
import type { Locale } from "@repo/database/locale"

/**
 * Where the order is going.
 *
 * A server component — it had a client boundary and nothing to do with it. The bilingual
 * shipping-option map that lived inside it is gone: `OrderOption` is a domain enum, and naming
 * its values was the fourth place in this application that named an enum privately.
 */

const SHIPPING_OPTION_LABEL: Record<string, Record<Locale, string>> = {
    BasicShipping: { en: "Basic shipping", ar: "الشحن الأساسي" },
    StandardShipping: { en: "Standard shipping", ar: "الشحن القياسي" },
    ExpressShipping: { en: "Express shipping", ar: "الشحن السريع" },
}

interface OrderShippingInfoProps {
    shippingAddress: ShippingAddress
    shippingOption: string
    locale: Locale
    translations: {
        shippingAddress: string
        shippingMethod: string
    }
}

export function OrderShippingInfo({
    shippingAddress,
    shippingOption,
    locale,
    translations: t,
}: OrderShippingInfoProps) {
    const method = SHIPPING_OPTION_LABEL[shippingOption]?.[locale] ?? shippingOption

    return (
        <section aria-labelledby="shipping-info" className="rounded-lg border bg-card p-6">
            <div className="mb-6 flex items-center gap-2">
                <MapPin aria-hidden className="size-5 text-muted-foreground" />
                <h2 id="shipping-info" className="text-lg font-semibold tracking-tight">
                    {t.shippingAddress}
                </h2>
            </div>

            <address className="space-y-1 text-sm not-italic">
                <p className="font-medium text-foreground">
                    <bdi dir="auto">{shippingAddress.fullName}</bdi>
                </p>
                <p className="text-muted-foreground">
                    <a href={`tel:${shippingAddress.phone}`} className="underline-offset-4 hover:underline">
                        {shippingAddress.phone}
                    </a>
                </p>
                {shippingAddress.email && <p className="text-muted-foreground">{shippingAddress.email}</p>}

                <div className="mt-3 space-y-0.5 border-t pt-3 text-muted-foreground">
                    <p>
                        <bdi dir="auto">{shippingAddress.addressLine1}</bdi>
                    </p>
                    {shippingAddress.addressLine2 && (
                        <p>
                            <bdi dir="auto">{shippingAddress.addressLine2}</bdi>
                        </p>
                    )}
                    <p>
                        <bdi dir="auto">
                            {shippingAddress.city}
                            {shippingAddress.state ? `, ${shippingAddress.state}` : ""}
                        </bdi>
                    </p>
                    <p className="tabular-nums">{shippingAddress.postalCode}</p>
                    <p>{shippingAddress.country}</p>
                </div>
            </address>

            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                {t.shippingMethod}: <span className="font-medium text-foreground">{method}</span>
            </p>
        </section>
    )
}
