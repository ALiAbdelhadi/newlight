import { getTranslations } from "next-intl/server"
import { Banknote, ShieldCheck, Truck } from "lucide-react"

/**
 * What buying involves, next to the button that starts it.
 *
 * The homepage has said "5–7 day delivery", "3–5 year warranty" and "cash on delivery" since
 * v1 — in the features band, four screens away from any product. The place a customer weighs
 * those three facts is under the Add to cart button, so they are repeated there, from the same
 * three claims and nowhere else.
 */
export async function PurchaseAssurance() {
    const t = await getTranslations("merchandising.assurance")

    const items = [
        { icon: Truck, title: t("delivery"), body: t("deliveryBody") },
        { icon: ShieldCheck, title: t("warranty"), body: t("warrantyBody") },
        { icon: Banknote, title: t("cod"), body: t("codBody") },
    ]

    return (
        <ul className="divide-y rounded-lg border bg-surface-sunk">
            {items.map((item) => (
                <li key={item.title} className="flex items-start gap-3 px-4 py-3">
                    <item.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0 text-sm">
                        <span className="block font-medium">{item.title}</span>
                        <span className="block text-muted-foreground">{item.body}</span>
                    </span>
                </li>
            ))}
        </ul>
    )
}
