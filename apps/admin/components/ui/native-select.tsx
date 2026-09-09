import { cn } from "@/lib/utils"

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                "h-[30px] w-full rounded-md border border-input bg-transparent px-2 text-sm",
                "transition-colors duration-(--duration-fast) outline-none",
                "focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}
