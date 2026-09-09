import { Notice } from "@/components/states"

/**
 * The condition attached to every shipping price on the site.
 *
 * Rendered wherever a rate is shown — the cart summary and the checkout's option picker — so
 * the sentence travels with the number rather than living on a policy page nobody opens.
 */
export function ShippingCoverageNote({
    title,
    body,
    tone = "info",
    className,
}: {
    title: string
    body: string
    tone?: "info" | "warning"
    className?: string
}) {
    return (
        <Notice tone={tone} title={title} className={className}>
            <p className="text-pretty">{body}</p>
        </Notice>
    )
}
