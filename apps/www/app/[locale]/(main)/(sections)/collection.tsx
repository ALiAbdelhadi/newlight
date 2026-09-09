import { numericLocale, resolveLocale } from "@repo/database"
import { getLocale, getTranslations } from "next-intl/server"

import Image from "@/components/app-image"
import { DirectionalArrow } from "@/components/directional-arrow"
import { Container, Section, SectionHeader } from "@/components/layout/section"
import { Reveal } from "@/components/reveal"
import { getCollectionCards } from "@/constants/collections"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/**
 * The lookbook: the featured collections, photographed as installed work.
 *
 * WHAT THIS REPLACED, twice over. The original was a bespoke composition — a 4:5 figure beside
 * a 4:3 figure with the right column pushed down `lg:pt-16` — and the first correction went one
 * step too far, flattening it into the same grid of bordered cards every other band uses. Both
 * versions left the same four problems standing:
 *
 *   IT WORE THE PRODUCT CARD'S CHROME. Rounded border, `bg-card`, `hover:-translate-y-0.5`,
 *   `hover:shadow-overlay` — the treatment of a thing you can put in a basket. A lookbook plate
 *   is not merchandise, and the frame around a photograph is what stops the photograph from
 *   being the point. The chrome is gone: the image gets `rounded-xl` (the system's media
 *   radius) and the caption sits on the page's own ground beneath it.
 *
 *   IT WAS THE FOURTH BORDERED-CARD GRID ON THE HOMEPAGE, and it rendered the SAME 4:3 card
 *   `/new-collection` renders when you click it. A preview indistinguishable from its own
 *   destination is not a preview.
 *
 *   ITS CONTENT WAS ASSEMBLED BY HAND AND DID NOT MATCH ITSELF. Two hardcoded image paths, and
 *   the first entry paired `image1Title` ("Modern Minimalism") with `living-tomorrowDescription`
 *   ("Experience the future of sustainable living") — a title and a description from two
 *   different pieces of copy. It reads `constants/collections.ts` now, the same source
 *   `/new-collection` is built from, so a collection renamed in one place is renamed in both.
 *
 *   TWO ENTRIES IN A GRID BUILT FOR MANY.
 *
 * THREE PLATES, AND `featured` IS WHAT PICKS THEM. Not `slice(0, 3)` — the constant already
 * marks which collections are the ones to lead with, and a fourth marked featured tomorrow
 * should change this section without anybody editing it. The cap is here because three across
 * is the composition; a fourth would start a second row and a lookbook is not a catalogue.
 *
 * WHY THREE ACROSS AND NOT AN ASYMMETRIC SPREAD. The asymmetric version (7 + 5, then 5 + 7) was
 * the more interesting composition and it broke on the thing compositions break on: PROXIMITY.
 * Two plates of different heights end at different points, so one caption finishes a long way
 * above the next row and the other finishes just above it — and a caption that sits closer to
 * the row below than to the photograph above it reads as that row's heading. Equal columns and
 * one row remove the failure rather than tuning it: every image ends on the same line, every
 * caption starts on the same line, and the only vertical rag left is the one sentence of
 * description that runs to three lines instead of two. It also cuts the band from roughly
 * 2000px to under 1000, which matters now that it is the second thing on the page.
 *
 * THE ONE MOMENT OF MOTION is the hairline under each caption drawing across on hover from the
 * reading edge — `origin-left`, mirrored by `rtl:origin-right`, because in Arabic the line has
 * to draw the other way. It is a transition, so the global reduced-motion rule zeroes it. The
 * image carries `data-reveal-media`, the storefront's own settle from grey into colour as the
 * plate arrives, and `transition-[scale,filter]` is what lets that animate rather than snap —
 * Tailwind 4's `scale-*` utilities set the `scale` property, not `transform`.
 *
 * NO DISPLAY FACE ASKED FOR. `globals.css` already sets every `h1/h2/h3` in Playfair, so the
 * section heading is the brand's face and the plate titles — spans, not headings — are Inter.
 * That contrast is the hierarchy; adding `face="display"` on top of it would flatten it.
 */

/**
 * The spread, as geometry rather than as three hand-written class strings.
 *
 * Index-addressed: position is the design, so the third plate spanning the full width on a
 * tablet is a property of the third SLOT, not of the third collection. At `lg` all three are
 * equal columns; below it, two plates side by side and the third closing the block full width,
 * which is what stops a three-item grid from leaving an orphan in a two-column row.
 */
const PLATES = [
    {
        span: "",
        ratio: "aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 46vw, 30vw",
    },
    {
        span: "",
        ratio: "aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 46vw, 30vw",
    },
    {
        span: "sm:col-span-2 lg:col-span-1",
        ratio: "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[4/5]",
        sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 94vw, 30vw",
    },
] as const

export async function Collection() {
    const locale = resolveLocale(await getLocale())

    /* The root translator is what `constants/collections.ts` takes — it reaches across several
       namespaces and needs `raw` for the tag arrays. The section's own copy stays scoped. */
    const [t, root] = await Promise.all([getTranslations("collection-section"), getTranslations()])

    const plates = getCollectionCards(root)
        .filter((card) => card.featured)
        .slice(0, PLATES.length)
    if (plates.length === 0) return null

    /* "01", and "٠١" in Arabic. An index is a figure the reader reads, so it goes through the
       locale's numbering system like every other figure on the storefront does. */
    const index = new Intl.NumberFormat(numericLocale(locale), {
        minimumIntegerDigits: 2,
        useGrouping: false,
    })

    return (
        <Section aria-label={t("sectionTitle")}>
            <Container>
                <SectionHeader
                    eyebrow={t("eyebrow")}
                    title={t("timeless-eleganceTitle")}
                    description={t("timeless-eleganceDescription")}
                    action={
                        <Link
                            href="/new-collection"
                            className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t("buttonText")}
                            <DirectionalArrow />
                        </Link>
                    }
                />

                {/*
                  * `gap-y-16` against the caption's `mt-6` is the proximity rule the previous
                  * composition broke: the space between a plate and the NEXT one has to be
                  * clearly larger than the space between a photograph and its own caption, or
                  * the caption attaches itself to the wrong picture. 64 against 24 is that
                  * ratio, and at `lg` there is only one row, so it never has to hold.
                  */}
                <ul className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
                    {plates.map((plate, position) => {
                        const geometry = PLATES[position]!

                        return (
                            <Reveal as="li" key={plate.slug} index={position} className={geometry.span}>
                                <Link href="/new-collection" className="group block">
                                    <figure>
                                        <div
                                            className={cn(
                                                "relative overflow-hidden rounded-xl bg-surface-sunk",
                                                geometry.ratio
                                            )}
                                        >
                                            <Image
                                                /* Empty, deliberately: the caption underneath names the
                                                   photograph, and a screen reader should not hear it twice. */
                                                alt=""
                                                src={plate.imageUrl}
                                                fill
                                                sizes={geometry.sizes}
                                                data-reveal-media
                                                className="object-cover transition-[scale,filter] duration-(--duration-slow) ease-out-fast group-hover:scale-[1.03]"
                                            />
                                        </div>

                                        <figcaption>
                                            <span className="mt-6 flex items-baseline gap-3 text-xs font-medium tracking-label text-muted-foreground uppercase">
                                                <span className="tabular">{index.format(position + 1)}</span>
                                                <span className="truncate">{plate.category}</span>
                                            </span>

                                            {/* The section's one piece of motion. The rule is always
                                                there in `--color-border`; the darker line inside it is
                                                what draws. */}
                                            <span aria-hidden className="mt-3 block h-px w-full bg-border">
                                                <span className="block h-px w-full origin-left scale-x-0 bg-foreground transition-transform duration-(--duration-slow) ease-out-fast group-hover:scale-x-100 rtl:origin-right" />
                                            </span>

                                            <span className="mt-5 flex items-start justify-between gap-4">
                                                <span className="min-w-0">
                                                    <span className="block text-xl font-semibold tracking-tight text-balance lg:text-2xl">
                                                        {plate.title}
                                                    </span>
                                                    <span className="mt-2 block text-pretty text-muted-foreground">
                                                        {plate.shortDescription}
                                                    </span>
                                                </span>
                                                <DirectionalArrow variant="circled" className="mt-0.5" />
                                            </span>
                                        </figcaption>
                                    </figure>
                                </Link>
                            </Reveal>
                        )
                    })}
                </ul>
            </Container>
        </Section>
    )
}
