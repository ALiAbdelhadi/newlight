import { cn } from "@/lib/utils"

export function Container({
    children,
    className,
    width = "default",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    width?: "default" | "prose" | "wide"
}) {
    return (
        <div
            className={cn(
                "mx-auto w-full px-5 lg:px-10",
                width === "default" && "max-w-[1280px]",
                width === "prose" && "max-w-[68ch]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function Section({
    children,
    className,
    tone = "default",
    spacing = "default",
    ...props
}: React.HTMLAttributes<HTMLElement> & {
    tone?: "default" | "sunk" | "inverted"
    spacing?: "tight" | "default"
}) {
    return (
        <section
            className={cn(
                spacing === "default" ? "py-20 lg:py-28" : "py-12 lg:py-16",
                tone === "sunk" && "border-t bg-surface-sunk",
                tone === "inverted" && "bg-foreground text-background",
                className
            )}
            {...props}
        >
            {children}
        </section>
    )
}

export interface SectionHeaderProps {
    eyebrow?: string
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    align?: "start" | "center"
    face?: "display" | "sans"
    className?: string
}

export function SectionHeader({
    eyebrow,
    title,
    description,
    action,
    align = "start",
    face = "sans",
    className,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                "mb-10 flex flex-col gap-4 lg:mb-14 lg:flex-row lg:items-end lg:justify-between",
                align === "center" && "lg:flex-col lg:items-center",
                className
            )}
        >
            <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
                {eyebrow && (
                    <p className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                        {eyebrow}
                    </p>
                )}
                <h2
                    className={cn(
                        "text-balance",
                        face === "display"
                            ? "font-display text-4xl italic lg:text-5xl"
                            : "text-3xl font-semibold tracking-tight lg:text-4xl"
                    )}
                >
                    {title}
                </h2>
                {description && (
                    <p className="mt-4 text-lg text-pretty text-muted-foreground">{description}</p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

export function PageHeader({
    eyebrow,
    title,
    description,
    action,
    className,
}: {
    eyebrow?: string
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("border-b py-10 lg:py-14", className)}>
            <Container>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        {eyebrow && (
                            <p className="mb-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                                {eyebrow}
                            </p>
                        )}
                        <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-4 text-lg text-pretty text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            </Container>
        </div>
    )
}

export function Prose({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "max-w-[68ch] text-base leading-relaxed text-muted-foreground",
                "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
                "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
                "[&_p]:mb-4",
                "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mb-1.5",
                "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:ps-5",
                "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4",
                "[&_strong]:font-semibold [&_strong]:text-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
