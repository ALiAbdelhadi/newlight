import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /*
         * Sized by the tokens, not by shadcn's defaults (§3.2, §3.3).
         *
         * The upstream control is 36px tall, sets 16px type that drops to 14px at `md`, carries
         * a `shadow-xs`, and paints `dark:bg-input/30` — a `dark:` utility of the exact kind the
         * token file forbids components from having. Every dense surface in the panel was
         * therefore overriding it inline with `h-[30px] text-sm`, roughly forty times, which is
         * how a "design system" ends up being whatever each call site remembered to type.
         *
         * 30px is `--field-height`. No shadow: §3.5 reserves elevation for things that float.
         */
        "h-[30px] w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm",
        "text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "transition-[color,box-shadow] outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
