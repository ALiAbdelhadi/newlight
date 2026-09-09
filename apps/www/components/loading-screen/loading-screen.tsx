import { useTranslations } from "next-intl"

export function LoadingScreen() {
    const t = useTranslations("LoadingScreen")

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex min-h-screen items-center justify-center px-6 text-foreground"
        >
            <div className="text-center">
                <div className="mb-8 flex justify-center gap-4">
                    {[0, 1, 2].map((index) => (
                        <span
                            key={index}
                            aria-hidden
                            style={{ animationDelay: `${index * 200}ms` }}
                            className="size-3 animate-pulse rounded-full bg-primary"
                        />
                    ))}
                </div>

                <h2 className="mb-2 text-2xl font-light tracking-tight md:text-3xl">{t("title")}</h2>
                <p className="font-light tracking-wide text-muted-foreground">{t("message")}</p>

                <div aria-hidden className="mx-auto mt-8 h-px w-16 bg-border" />
            </div>
        </div>
    )
}
