"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  isRTL?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isRTL = false, placeholder, ...props }, ref) => {
    const detectRTL = placeholder ? /[\u0600-\u06FF]/.test(placeholder) : isRTL;

    return (
      <input
        type={type}
        dir={detectRTL ? "rtl" : "ltr"}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input/50 bg-transparent px-3 py-1 shadow-sm transition-all duration-200",
          "text-base md:text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:me-4",
          detectRTL ? "text-right" : "text-left",
          "[dir='rtl']:placeholder:text-right [dir='ltr']:placeholder:text-left",
          "placeholder:text-muted-foreground",
          className
        )}
        ref={ref}
        style={{
          textAlign: detectRTL ? 'right' : 'left',
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }