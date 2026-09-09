"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"


export function AuthShell({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string
    subtitle: string
    children: ReactNode
    footer?: ReactNode
}) {
    return (
        <div className="w-full border border-border p-6 sm:p-8">
            <h1 className="text-2xl font-light tracking-wider text-foreground">{title}</h1>
            <p className="mt-2 mb-6 text-sm font-light tracking-wider text-muted-foreground">{subtitle}</p>
            {children}
            {footer ? <div className="mt-6 text-sm font-light tracking-wider">{footer}</div> : null}
        </div>
    )
}

export function AuthField({
    id,
    label,
    type = "text",
    autoComplete,
    required = true,
    minLength,
    defaultValue,
}: {
    id: string
    label: string
    type?: string
    autoComplete?: string
    required?: boolean
    minLength?: number
    defaultValue?: string
}) {
    return (
        <div className="mb-4 space-y-2">
            <Label htmlFor={id} className="text-sm font-normal tracking-wider text-foreground">
                {label}
            </Label>
            <Input
                id={id}
                name={id}
                type={type}
                autoComplete={autoComplete}
                required={required}
                minLength={minLength}
                defaultValue={defaultValue}
                className="rounded-none border-border bg-secondary text-foreground transition-colors duration-(--duration-fast) focus-visible:border-primary focus-visible:bg-primary-soft"
            />
        </div>
    )
}

export function AuthSubmit({ pending, children }: { pending: boolean; children: ReactNode }) {
    return (
        <Button
            type="submit"
            disabled={pending}
            className={cn(
                "w-full rounded-none text-sm font-medium tracking-wider transition-all duration-300",
                "hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-70"
            )}
        >
            {children}
        </Button>
    )
}

export function AuthMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
    if (!children) return null
    return (
        <p
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "mb-4 border-s-2 py-2 ps-3 text-sm font-light tracking-wide",
                tone === "error" ? "border-destructive text-destructive" : "border-primary text-muted-foreground"
            )}
        >
            {children}
        </p>
    )
}
