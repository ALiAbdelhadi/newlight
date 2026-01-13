"use client"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

interface OrderActionsProps {
    orderId: string
    translations: {
        viewOrderDetails: string
        continueShopping: string
    }
}

export function OrderActions({ orderId, translations: t }: OrderActionsProps) {
    return (
        <>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex-1 h-12">
                    <Link href={`/orders/${orderId}`}>
                        {t.viewOrderDetails}
                    </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 h-12">
                    <Link href="/">
                        {t.continueShopping}
                    </Link>
                </Button>
            </div>
        </>
    )
}