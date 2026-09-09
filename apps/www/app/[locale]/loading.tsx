import { useTranslations } from "next-intl"

/**
 * The route-level loading screen.
 *
 * Three dots pulsing in sequence, which was a GSAP infinite timeline — a repeating decoration
 * held open by JavaScript for as long as the page took to arrive. It is three CSS keyframes
 * now: no library on the critical path of the one screen that exists BECAUSE something is
 * slow, and the global `prefers-reduced-motion` rule in globals.css stops it for anyone who
 * has asked for that, which the timeline never did.
 *
 * A server component. There was nothing here that needed the client except the animation.
 */
export default function Loading() {
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
                            // The stagger is the only thing that differs between the three, so
                            // it is the only thing set per dot.
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
