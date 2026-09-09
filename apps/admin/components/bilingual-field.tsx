"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import type { TranslationState } from "@/lib/status"

export interface LanguageValue {
    value: string
    onChange: (value: string) => void
    error?: string
}

interface BilingualFieldProps {
    label: string
    en: LanguageValue
    ar: LanguageValue
    multiline?: boolean
    required?: "both" | "en" | "none"
    description?: string
    disabled?: boolean
    rows?: number
}

export function translationStateOf(en: string, ar: string): TranslationState {
    const hasEn = en.trim().length > 0
    const hasAr = ar.trim().length > 0
    if (hasEn && hasAr) return "complete"
    if (hasEn) return "en_only"
    if (hasAr) return "ar_only"
    return "missing"
}

export function BilingualField({
    label,
    en,
    ar,
    multiline = false,
    required = "both",
    description,
    disabled = false,
    rows = 3,
}: BilingualFieldProps) {
    const state = translationStateOf(en.value, ar.value)
    const showState = required !== "none" && state !== "complete"

    return (
        <fieldset disabled={disabled} className="min-w-0 space-y-1.5">
            <legend className="flex items-center gap-2 pb-1 text-xs font-medium">
                {label}
                {showState && <StatusBadge kind="translation" value={state} />}
            </legend>

            {description && <p className="pb-0.5 text-2xs text-muted-foreground">{description}</p>}

            <LanguageRow
                id={`${label}-en`}
                languageLabel="English"
                lang="en"
                dir="ltr"
                field={en}
                multiline={multiline}
                rows={rows}
            />

            <LanguageRow
                id={`${label}-ar`}
                languageLabel="العربية"
                lang="ar"
                dir="rtl"
                field={ar}
                multiline={multiline}
                rows={rows}
                placeholder="العربية"
                className="font-arabic"
            />
        </fieldset>
    )
}

function LanguageRow({
    id,
    languageLabel,
    lang,
    dir,
    field,
    multiline,
    rows,
    placeholder,
    className,
}: {
    id: string
    languageLabel: string
    lang: string
    dir: "ltr" | "rtl"
    field: LanguageValue
    multiline: boolean
    rows: number
    placeholder?: string
    className?: string
}) {
    const errorId = `${id}-error`
    const shared = {
        id,
        lang,
        dir,
        value: field.value,
        placeholder,
        "aria-invalid": !!field.error,
        "aria-describedby": field.error ? errorId : undefined,
        className: cn(className),
    }

    return (
        <div className="grid grid-cols-[70px_minmax(0,1fr)] items-start gap-2">
            <label
                htmlFor={id}
                className={cn("pt-1.5 text-2xs text-muted-foreground", lang === "ar" && "font-arabic")}
            >
                {languageLabel}
            </label>
            <div className="min-w-0">
                {multiline ? (
                    <Textarea
                        {...shared}
                        rows={rows}
                        onChange={(event) => field.onChange(event.target.value)}
                    />
                ) : (
                    <Input {...shared} onChange={(event) => field.onChange(event.target.value)} />
                )}
                {field.error && (
                    <p id={errorId} className="mt-0.5 text-2xs text-danger">
                        {field.error}
                    </p>
                )}
            </div>
        </div>
    )
}
