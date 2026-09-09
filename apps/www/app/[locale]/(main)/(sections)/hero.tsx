import Image from "@/components/app-image"
import { getLocale, getTranslations } from "next-intl/server"

import { encodeSlug, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"
import { CategoryService } from "@/lib/services/category-service"
import { DirectionalArrow } from "@/components/directional-arrow"
import { cn } from "@/lib/utils"

/**
 * The homepage hero.
 *
 * A SERVER COMPONENT. What it replaces was a 214-line client component whose entire job was to
 * render two images and four links, and whose GSAP timeline did four things — three of them
 * wrong:
 *
 *   IT HID THE PAGE UNTIL JAVASCRIPT RAN. `gsap.set([...], { opacity: 0 })` on mount, revealed
 *   by a timeline. With JS slow, blocked or errored, the hero was blank — and there was no
 *   `prefers-reduced-motion` guard anywhere in the storefront, so the parallax ran for everyone.
 *
 *   IT REACHED OUTSIDE ITSELF. `document.querySelectorAll('a')` — every anchor on the page,
 *   including the header's and the footer's — to attach mouseenter/mouseleave handlers. Both
 *   handlers animated the underline to the same `3rem`, so the hover effect they existed for
 *   was a no-op, and the listeners were never removed (the cleanup was returned from a `forEach`
 *   callback, where nothing calls it).
 *
 *   IT SHOWED SOMEBODY ELSE'S LIGHTING. The products tile was a hardcoded Unsplash URL —
 *   `photo-1513694203232-719a280e022f` — so a lighting manufacturer's homepage advertised its
 *   catalogue with a stock photograph of a fixture it does not sell, fetched from a third party
 *   on every visit. It is the real catalogue photograph now.
 *
 * IT DOES ANIMATE ON LOAD, and the distinction between this and what was removed is the whole
 * point. The entrance is four CSS keyframe animations (`.hero-in` / `.hero-media` in
 * globals.css) declared on markup the server has already sent: the photograph settles out of a
 * 1.05 scale, the headline, the strapline and the buttons rise into place behind it, and the
 * two category tiles follow. No bundle has to run for any of it, so the failure mode of a slow
 * or blocked script is a hero that is simply already there — never a blank one. Under
 * `prefers-reduced-motion: reduce` the animation is dropped entirely, not merely shortened,
 * because the delays alone would hold the type invisible.
 *
 * Everything below the fold still reveals on scroll instead (`components/reveal.tsx`); this is
 * the one surface that is on screen at the moment the page opens and therefore the one that can
 * have an entrance at all.
 */
/** Fallback imagery, by position, for a category that has none of its own on disk yet. */
const TILE_IMAGE = ["/category/indoor-lighting-1.png", "/category/outdoor-lighting-1.png"]

export async function Hero() {
    const t = await getTranslations("hero-section")
    const locale = resolveLocale(await getLocale())

    /*
     * The tiles are the REAL top-level categories, in the operator's order, with the operator's
     * names in the reader's language. Hardcoding "/category/indoor-lighting" would have been a
     * link that breaks the day somebody renames a category in the panel — and renaming one is
     * a thing the panel now supports, with the old slug kept as a redirect.
     */
    const categories = (await CategoryService.getAllCategories(locale)).slice(0, 2)

    return (
        <>
            {/*
              * TEXT BESIDE THE PHOTOGRAPH, NOT ON TOP OF IT.
              *
              * The first attempt kept the original composition — headline over the image behind
              * a scrim — and looking at it settled the question: the hero photograph is a bright
              * interior and the headline is near-black, so the scrim has to be strong enough to
              * lift the whole picture towards white before the text is legible. At that point
              * the photograph is gone and the scrim is doing nothing but hiding it.
              *
              * A column of plain ground next to a full-bleed image gives both things their own
              * space: the type is set on the page's own background at full contrast, and the
              * photograph is untouched.
              */}
            <section className="-mt-16 grid min-h-[80svh] grid-cols-1 border-b pt-16 lg:grid-cols-12">
                <div className="order-2 flex flex-col justify-center px-5 py-14 lg:order-1 lg:col-span-5 lg:px-12 lg:py-24 xl:px-16">
                    {/* The stagger. Three steps of 140ms — slow enough to read as a sequence
                        being drawn rather than a block that arrived late, and the last of them
                        still finishes at 400ms + 950ms, inside the time it takes to read the
                        headline. The photograph starts at 0ms so that nothing waits on it. */}
                    <div className="max-w-xl">
                        <h1 className="hero-in font-display text-5xl leading-[1.05] text-balance italic [--hero-delay:120ms] md:text-6xl lg:text-6xl xl:text-7xl">
                            {t("illuminate")}
                        </h1>
                        <p className="hero-in mt-5 text-sm font-medium tracking-hero text-muted-foreground uppercase [--hero-delay:260ms]">
                            {t("inspirationGlow")}
                        </p>

                        <div className="hero-in mt-10 flex flex-wrap gap-3 [--hero-delay:400ms]">
                            <Link
                                href="/category"
                                className="group inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors duration-(--duration-fast) hover:bg-primary/90"
                            >
                                {t("browseCatalogue")}
                                <DirectionalArrow />
                            </Link>
                            <Link
                                href="/technical-resources"
                                className="inline-flex h-12 items-center rounded-md border border-border-strong px-6 text-sm font-medium transition-colors duration-(--duration-fast) hover:bg-accent"
                            >
                                {t("technicalResources")}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* `overflow-hidden` because the photograph starts at `scale: 1.05` — the
                    animation is on the image, not on this column, so the 5% never bleeds over
                    the type beside it. */}
                <div className="relative order-1 min-h-[42svh] overflow-hidden lg:order-2 lg:col-span-7 lg:min-h-0">
                    <Image
                        src="/hero/hero.jpg"
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="hero-media object-cover object-center"
                    />
                    {/* A SCRIM MADE OF THE PAGE'S OWN GROUND, not of black. `--background`
                        means the photograph fades into the same colour the column beside it is
                        painted in — so the two halves read as one surface with a picture set
                        into it, and the effect inverts correctly in dark mode instead of
                        laying a grey film over a dark room. Weak on purpose: the strongest
                        stop is 45% and only at the bottom edge, where the tiles begin. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-background/8 bg-gradient-to-t from-background/45 via-background/8 to-transparent"
                    />
                </div>
            </section>

            {/* The two top-level categories, as their own band. They were a quarter of the hero
                before, sharing it with a hover-only "inspiration" panel that had no link on it —
                a quarter of the homepage's most valuable surface that did nothing when clicked. */}
            {categories.length > 0 && (
                <section aria-label={t("browseCatalogue")} className="grid grid-cols-1 border-b sm:grid-cols-2">
                    {categories.map((category, index) => {
                        const translation = category.translations[0]
                        if (!translation) return null
                        return (
                            /* The delay class is written out rather than composed: Tailwind reads
                               source text, so an interpolated `[--hero-delay:…]` generates no rule. */
                            <HeroTile
                                key={category.id}
                                href={`/category/${encodeSlug(translation.slug)}`}
                                image={category.imageUrl || TILE_IMAGE[index] || TILE_IMAGE[0]!}
                                label={translation.name}
                                delayClassName={index === 0 ? "[--hero-delay:540ms]" : "[--hero-delay:660ms]"}
                            />
                        )
                    })}
                </section>
            )}
        </>
    )
}

function HeroTile({
    href,
    image,
    label,
    delayClassName,
}: {
    href: string
    image: string
    label: string
    delayClassName: string
}) {
    return (
        /* The entrance is on the Link itself, not on a wrapper: the tiles are the grid's own
           children and `sm:not-first:border-s` draws the divider between them, so wrapping each
           one would make every tile a first child and lose that border. */
        <Link
            href={href}
            className={cn(
                "hero-in group relative flex min-h-[34svh] overflow-hidden border-b last:border-b-0 sm:border-b-0 sm:not-first:border-s",
                delayClassName
            )}
        >
            <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-(--duration-slow) group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            <span className="relative z-10 mt-auto flex w-full items-center justify-between gap-4 p-6 lg:p-8">
                <span className="font-display text-2xl text-background italic lg:text-3xl">{label}</span>
                {/* The circled treatment, because the whole tile is the target — the same
                    relationship the product card's arrow has to the product card. */}
                <DirectionalArrow variant="circled" className="border-background/40 text-background" />
            </span>
        </Link>
    )
}
