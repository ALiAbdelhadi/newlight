import { Notice } from "@/components/states"

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
