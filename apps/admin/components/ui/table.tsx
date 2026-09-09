"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The STATIC table (P4.5 §11).
 *
 * `components/data-table` is the answer for any list an operator sorts, filters or pages.
 * This one is for readouts whose whole result set is the point — the low-stock list, the
 * fulfilment queue, an order's line items — and its only job is to look identical to the
 * other one while doing less.
 *
 * That is what these defaults are for. shadcn ships 40px headers in foreground weight and
 * 8px cell padding, so a static table beside a DataTable read as a different component in a
 * different application: taller rows, darker headers, no sunk header ground. The numbers here
 * are §3.3's compact density — 32px header, 34px rows, 10px/6px cells — so the two agree
 * without every caller passing className overrides to make them.
 */

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-surface-sunk [&_tr]:border-b [&_tr]:border-border-strong", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-[34px] border-b transition-colors duration-(--duration-fast)",
        "hover:bg-accent/50 data-[state=selected]:bg-primary-soft",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-8 px-2.5 py-0 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2.5 py-1.5 align-middle whitespace-nowrap",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
