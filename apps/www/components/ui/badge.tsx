import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-sm hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary/90 text-secondary-foreground backdrop-blur-sm shadow-sm hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive/90 text-destructive-foreground backdrop-blur-sm shadow-sm hover:bg-destructive/80",
                outline:
                    "border border-border/40 text-foreground bg-background/50 backdrop-blur-sm hover:bg-muted/20",
                success:
                    "border-transparent bg-green-500/90 text-white backdrop-blur-sm shadow-sm hover:bg-green-500/80",
                warning:
                    "border-transparent bg-amber-500/90 text-white backdrop-blur-sm shadow-sm hover:bg-amber-500/80",
                info: "border-transparent bg-blue-500/90 text-white backdrop-blur-sm shadow-sm hover:bg-blue-500/80",
            },
            removable: {
                true: "pr-1",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            removable: false,
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    removable?: boolean
    onRemove?: () => void
    icon?: React.ReactNode
}

function Badge({
    className,
    variant,
    removable,
    onRemove,
    icon,
    children,
    ...props
}: BadgeProps) {
    return (
        <div
            className={cn(badgeVariants({ variant, removable }), className)}
            {...props}
        >
            {icon && <span className="flex items-center">{icon}</span>}
            {children}
            {removable && (
                <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove?.()
                    }}
                    aria-hidden="true"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}
        </div>
    )
}

export { Badge, badgeVariants }

