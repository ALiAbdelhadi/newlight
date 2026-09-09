"use client"

import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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
        <div className="w-full">
            <h1 className="font-display text-3xl text-foreground ltr:italic sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground ltr:tracking-wide">{subtitle}</p>
            <div aria-hidden className="mt-6 h-px w-10 bg-primary" />

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-8 border-t pt-6 text-sm ltr:tracking-wide">{footer}</div> : null}
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
    autoFocus,
    hint,
    dir = "auto",
}: {
    id: string
    label: string
    type?: string
    autoComplete?: string
    required?: boolean
    minLength?: number
    defaultValue?: string
    autoFocus?: boolean
    hint?: string
    dir?: "auto" | "ltr"
}) {
    const t = useTranslations("auth")
    const hintId = useId()
    const capsId = useId()
    const [revealed, setRevealed] = useState(false)
    const [capsLock, setCapsLock] = useState(false)

    const isPassword = type === "password"
    const describedBy = [hint ? hintId : null, capsLock ? capsId : null].filter(Boolean).join(" ")

    return (
        <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <Label htmlFor={id} className="text-sm font-normal text-foreground ltr:tracking-wide">
                    {label}
                </Label>
                {required ? null : (
                    <span className="text-2xs text-muted-foreground uppercase ltr:tracking-label">{t("optional")}</span>
                )}
            </div>

            <div className="relative">
                <Input
                    id={id}
                    name={id}
                    type={isPassword && revealed ? "text" : type}
                    autoComplete={autoComplete}
                    required={required}
                    minLength={minLength}
                    defaultValue={defaultValue}
                    autoFocus={autoFocus}
                    dir={dir}
                    aria-describedby={describedBy || undefined}
                    onKeyUp={
                        isPassword
                            ? (event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false)
                            : undefined
                    }
                    onBlur={isPassword ? () => setCapsLock(false) : undefined}
                    style={{ textAlign: "start" }}
                    className={cn(
                        "h-11 rounded-none border-border bg-secondary px-3 text-foreground shadow-none",
                        "transition-colors duration-(--duration-fast)",
                        "focus-visible:border-primary focus-visible:bg-primary-soft focus-visible:ring-0",
                        isPassword && "pe-12"
                    )}
                />

                {isPassword ? (
                    <button
                        type="button"
                        onClick={() => setRevealed((value) => !value)}
                        aria-label={revealed ? t("hidePassword") : t("showPassword")}
                        aria-pressed={revealed}
                        className="absolute inset-y-0 end-0 grid w-12 place-items-center text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground"
                    >
                        {revealed ? (
                            <EyeOff aria-hidden className="size-4" />
                        ) : (
                            <Eye aria-hidden className="size-4" />
                        )}
                    </button>
                ) : null}
            </div>

            {hint ? (
                <p id={hintId} className="mt-2 text-xs text-muted-foreground ltr:tracking-wide">
                    {hint}
                </p>
            ) : null}

            {capsLock ? (
                <p id={capsId} role="status" className="mt-2 text-xs text-warning ltr:tracking-wide">
                    {t("capsLock")}
                </p>
            ) : null}
        </div>
    )
}

export function AuthSubmit({ pending, children }: { pending: boolean; children: ReactNode }) {
    return (
        <Button
            type="submit"
            disabled={pending}
            className={cn(
                "h-11 w-full rounded-none text-sm font-medium uppercase ltr:tracking-label",
                "transition-colors duration-(--duration-base) hover:bg-primary/90 disabled:opacity-80"
            )}
        >
            {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
            {children}
        </Button>
    )
}

export function AuthMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
    if (!children) return null

    return (
        <p
            role={tone === "error" ? "alert" : "status"}
            tabIndex={-1}
            className={cn(
                "mb-5 border-s-2 px-3 py-2.5 text-sm ltr:tracking-wide",
                tone === "error"
                    ? "border-danger-border bg-danger-bg text-danger"
                    : "border-success-border bg-success-bg text-success"
            )}
        >
            {children}
        </p>
    )
}
