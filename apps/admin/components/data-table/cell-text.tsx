import { cn } from "@/lib/utils"

export function CellText({
    children,
    className,
    truncate = true,
    ...props
}: React.ComponentProps<"bdi"> & { truncate?: boolean }) {
    return (
        <bdi
            dir="auto"
            className={cn("block", truncate && "truncate", className)}
            {...props}
        >
            {children}
        </bdi>
    )
}

export function CellIdentity({
    name,
    identifier,
    className,
}: {
    name: string
    identifier?: string | null
    className?: string
}) {
    const redundant = !identifier || identifier === name

    if (redundant) {
        return (
            <bdi dir="auto" className={cn("block truncate font-mono text-sm", className)} title={name}>
                {name}
            </bdi>
        )
    }

    return (
        <div className={cn("flex min-w-0 items-baseline gap-1.5", className)}>
            <CellText className="font-medium" title={name}>
                {name}
            </CellText>
            <bdi dir="auto" className="shrink-0 font-mono text-2xs text-muted-foreground">
                {identifier}
            </bdi>
        </div>
    )
}
