"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

const ToggleGroupContext = React.createContext<{ size: "sm" | "default" }>({
    size: "default",
})

function ToggleGroup({
    className,
    size = "default",
    children,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
    size?: "sm" | "default"
}) {
    return (
        <ToggleGroupPrimitive.Root
            data-slot="toggle-group"
            data-size={size}
            className={cn(
                "group/toggle-group flex w-fit items-center rounded-md border border-border-strong bg-card",
                className
            )}
            {...props}
        >
            <ToggleGroupContext.Provider value={{ size }}>{children}</ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
    )
}

function ToggleGroupItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
    const context = React.useContext(ToggleGroupContext)

    return (
        <ToggleGroupPrimitive.Item
            data-slot="toggle-group-item"
            data-size={context.size}
            className={cn(
                "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium",
                "text-muted-foreground transition-colors duration-(--duration-fast)",
                "hover:bg-accent hover:text-foreground",
                "data-[state=on]:bg-accent data-[state=on]:text-foreground",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:z-10",
                "border-l border-border first:border-l-0",
                "first:rounded-l-[5px] last:rounded-r-[5px]",
                "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
                context.size === "sm" ? "h-6 px-2" : "h-[30px] px-2.5",
                className
            )}
            {...props}
        >
            {children}
        </ToggleGroupPrimitive.Item>
    )
}

export { ToggleGroup, ToggleGroupItem }
