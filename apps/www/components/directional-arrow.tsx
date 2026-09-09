import { cn } from "@/lib/utils"

export type ArrowVariant = "circled" | "inline"

interface DirectionalArrowProps {
    variant?: ArrowVariant
    className?: string
    standalone?: boolean
}

function Glyph({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className={cn("rtl:rotate-180", className)}
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
    )
}

export function DirectionalArrow({ variant = "inline", className, standalone = false }: DirectionalArrowProps) {
    if (variant === "circled") {
        return (
            <span
                className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border border-border",
                    "transition-colors duration-(--duration-base)",
                    standalone
                        ? "hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        : "group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground",
                    className
                )}
            >
                <Glyph className="size-4" />
            </span>
        )
    }

    return (
        <Glyph
            className={cn(
                "size-4 shrink-0 transition-transform duration-(--duration-fast)",
                standalone
                    ? "hover:translate-x-0.5 rtl:hover:-translate-x-0.5"
                    : "group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
                className
            )}
        />
    )
}
