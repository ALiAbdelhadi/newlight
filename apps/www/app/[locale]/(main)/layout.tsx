import { getLocale, getTranslations } from "next-intl/server"
import { resolveLocale } from "@repo/database"

import { Footer } from "@/components/navigation/footer"
import { Nav } from "@/components/navigation/nav"
import { OffersBar } from "@/components/offers-bar"
import { offersHighlight } from "@/lib/services/offers-service"
import { JsonLd, organisationSchema, webSiteSchema } from "@/lib/structured-data"

/**
 * The public shell.
 *
 * `pt-16` on `<main>` is new and is a bug fix, not spacing taste: the header is
 * `position: fixed` and nothing reserved its 64px, so every page except the homepage began
 * underneath it. It was invisible on the homepage because the hero happens to open with 96px of
 * its own padding, which is why nobody noticed — and visible on `/orders`, `/about`, `/privacy`
 * and every category page, where the first line of the heading sat behind the logo.
 *
 * The hero opts out locally (`-mt-16 pt-16`), so the photograph still runs up behind a
 * transparent header while its text clears it.
 *
 * THE OFFERS STRIP sits above the header while anything is discounted (§13.2, ADR 0009), and
 * its height is published as `--announcement-height` on this wrapper rather than hardcoded
 * anywhere. The nav reads it for its `top`, the content reads it for its padding, and it is
 * `0px` when no discount is running — so the strip appearing and disappearing is one number
 * changing in one place, and the hero's `-mt-16` keeps working untouched because that offset
 * was always about the HEADER, not about whatever is above it.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const [t, offers, locale] = await Promise.all([
        getTranslations("Common"),
        offersHighlight(),
        getLocale().then(resolveLocale),
    ])

    return (
        <div style={offers ? { "--announcement-height": "36px" } as React.CSSProperties : undefined}>
            {/* Who we are and what the site is, once for the whole storefront rather than
                repeated per page — the `@id` refs let every product's `seller` point here. */}
            <JsonLd data={[organisationSchema(locale), webSiteSchema(locale)]} />

            {/* Keyboard users reach the header's eight controls before any page content.
                Visually hidden until focused, then a real, visible control. */}
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
                {t("skipToContent")}
            </a>

            {offers && <OffersBar {...offers} />}

            <Nav hasOffers={Boolean(offers)} />
            <main
                id="content"
                role="main"
                className="pt-[calc(var(--header-height)+var(--announcement-height))]"
            >
                {children}
            </main>
            <Footer />
        </div>
    )
}
