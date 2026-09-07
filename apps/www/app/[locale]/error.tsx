"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { reportError } from "@/lib/report-error"

/**
 * What a customer sees when a page throws.
 *
 * Neither app had one of these, so any exception rendered Next's default error page: an
 * unbranded "something went wrong", in English, on an Arabic site, with no way back and no
 * record that it happened.
 *
 * `digest` is the id Next assigns to the server-side error. Showing it is the difference
 * between a customer saying "the site is broken" and a customer saying "the site is broken,
 * reference a1b2c3" — the second one is findable in the logs.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useTranslations("error-page")

    useEffect(() => {
        reportError(error, { boundary: "locale" })
    }, [error])

    return (
        <div className="min-h-[60vh] grid place-items-center px-6 py-24">
            <div className="max-w-md text-center">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-4">{t("title")}</h1>
                <p className="text-muted-foreground mb-8">{t("body")}</p>

                <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={reset}>{t("retry")}</Button>
                    <Button variant="secondary" asChild>
                        <Link href="/">{t("home")}</Link>
                    </Button>
                </div>

                {error.digest && (
                    <p className="text-xs text-muted-foreground mt-8">
                        {t("reference")} <span className="font-mono">{error.digest}</span>
                        <br />
                        {t("referenceHint")}
                    </p>
                )}
            </div>
        </div>
    )
}
