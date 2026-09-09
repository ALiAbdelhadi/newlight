"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import type { TranslationState } from "@/lib/status"

/**
 * THE bilingual editor (P4.5 §16).
 *
 * One pair of fields, English above Arabic, with each language carrying its own completeness
 * state.
 *
 * THE RULE THIS COMPONENT EXISTS TO ENFORCE: Arabic never falls back to English. There is no
 * copy-across button, the Arabic placeholder is `العربية` and never the English value, and an
 * empty Arabic field renders a warning rather than quietly showing the English text greyed
 * out. That is not a UI preference — it mirrors the data layer, where `translationFallback`
 * is a deliberate storefront affordance and the admin's job is to show what is actually
 * stored. A panel that displays English in the Arabic slot makes a missing translation
 * invisible, and the translation queue then reports a gap nobody can find.
 *
 * The Arabic input carries `dir="rtl"`, `lang="ar"` and `font-arabic`, which resolves to
 * Almarai. Without the explicit font the field inherits the Latin-first stack and Arabic
 * renders in a fallback face — the failure measured during the token work, where an Arabic
 * string set 110px narrower in Arial than in Almarai.
 */

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
    /** `both` marks the pair incomplete unless each side has a value. */
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
        /*
         * A fieldset, not two loose inputs. The pair IS one field conceptually, and a screen
         * reader that announces "English" and "Arabic" without the legend gives no clue which
         * property is being edited.
         */
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
                // Placeholder is the language's own name — never the English value.
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
