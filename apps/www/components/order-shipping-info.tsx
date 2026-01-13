"use client"

import { ShippingAddress } from "@repo/database"
import { MapPin } from "lucide-react"

interface OrderShippingInfoProps {
    shippingAddress: ShippingAddress
    shippingOption: string
    isArabic: boolean
    translations: {
        shippingAddress: string
        shippingMethod: string
    }
}

export function OrderShippingInfo({
    shippingAddress,
    shippingOption,
    isArabic,
    translations: t
}: OrderShippingInfoProps) {
    const formatShippingOption = (option: string) => {
        const map: Record<string, string> = {
            BasicShipping: isArabic ? "الشحن الأساسي" : "Basic Shipping",
            StandardShipping: isArabic ? "الشحن القياسي" : "Standard Shipping",
            ExpressShipping: isArabic ? "الشحن السريع" : "Express Shipping",
        }
        return map[option] || option
    }

    return (
        <div className="rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5" />
                <h2 className="text-2xl font-serif font-light">{t.shippingAddress}</h2>
            </div>
            <div className="space-y-2 text-sm">
                <p className="font-medium">{shippingAddress.fullName}</p>
                <p className="text-muted-foreground">{shippingAddress.phone}</p>
                {shippingAddress.email && (
                    <p className="text-muted-foreground">{shippingAddress.email}</p>
                )}
                <div className="pt-2 border-t border-border mt-3">
                    <p>{shippingAddress.addressLine1}</p>
                    {shippingAddress.addressLine2 && (
                        <p>{shippingAddress.addressLine2}</p>
                    )}
                    <p>
                        {shippingAddress.city}
                        {shippingAddress.state && `, ${shippingAddress.state}`}
                    </p>
                    <p>{shippingAddress.postalCode}</p>
                    <p>{shippingAddress.country}</p>
                </div>
                <div className="pt-3 border-t border-border mt-3">
                    <p className="text-muted-foreground">
                        {t.shippingMethod}: <span className="text-foreground font-medium">{formatShippingOption(shippingOption)}</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
