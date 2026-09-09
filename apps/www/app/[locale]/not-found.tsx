import { useTranslations } from "next-intl"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Link } from "@/i18n/navigation"

/**
 * 404.
 *
 * A server component. What it replaced set the number, the text and the buttons to
 * `opacity: 0` on mount and revealed them from a GSAP timeline — so a customer who landed on a
 * dead link with JavaScript still loading saw a blank screen instead of the one page whose
 * entire job is to explain that something is missing. It also floated the "404" up and down
 * forever on an infinite yoyo, through a `prefers-reduced-motion` setting it could not see.
 *
 * The entrance is gone rather than reimplemented. This page is a dead end; the useful thing is
 * the two ways out, immediately.
 */
export default function NotFound() {
    const t = useTranslations("notFound")

    return (
        <div className="flex min-h-screen items-center justify-center px-6 text-foreground">
            <div className="w-full max-w-2xl text-center">
                <p className="font-display text-6xl font-light tracking-tighter lg:text-7xl">404</p>
                <div aria-hidden className="mx-auto mt-4 h-px w-24 bg-border" />

                <h1 className="mt-8 text-3xl font-light tracking-tight text-balance sm:text-4xl md:text-5xl">
                    {t("title")}
                </h1>
                <p className="mt-4 text-lg font-light tracking-wide text-pretty text-muted-foreground md:text-xl">
                    {t("description")}
                </p>

                <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                        href="/"
                        className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90"
                    >
                        {t("home")}
                        <DirectionalArrow />
                    </Link>
                    <Link
                        href="/contact"
                        className="inline-flex h-12 items-center justify-center rounded-md border border-border-strong px-8 text-sm font-medium transition-colors duration-(--duration-fast) hover:bg-accent"
                    >
                        {t("contact")}
                    </Link>
                </div>
            </div>
        </div>
    )
}
