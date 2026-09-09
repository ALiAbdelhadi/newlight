"use client"

import { ProductCard } from "@/components/product-card"
import { Link } from "@/i18n/navigation"
import type { SerializedMoney } from "@repo/database"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef } from "react"

export interface CarouselCard {
    id: string
    slug: string
    name: string
    image: string
    section: string
    categorySlug: string
    subCategorySlug: string
    price: SerializedMoney
    basePrice: SerializedMoney
    discountPercent: number
}
export interface CarouselGeometry {
    containerWidth: number
    cardWidth: number
    leads: number[]
}

const GAP = 20

export function pageDelta(geometry: CarouselGeometry, direction: 1 | -1, rtl: boolean): number {
    const { containerWidth, cardWidth, leads } = geometry
    if (leads.length === 0 || cardWidth <= 0 || containerWidth <= 0) return 0

    const first = Math.max(0, leads.findIndex((lead) => lead > -1))
    const step = Math.max(1, Math.floor(containerWidth / (cardWidth + GAP)) - 1)

    const target = Math.min(leads.length - 1, Math.max(0, first + direction * step))
    const distance = leads[target] ?? 0
    return rtl ? -distance : distance
}

export function ProductCarousel({ products }: { products: CarouselCard[] }) {
    const t = useTranslations("offers")
    const track = useRef<HTMLUListElement>(null)

    function page(direction: 1 | -1) {
        const element = track.current
        if (!element) return

        const items = [...element.children] as HTMLElement[]
        if (items.length === 0) return

        const box = element.getBoundingClientRect()
        const rtl = getComputedStyle(element).direction === "rtl"
        const leads = items.map((item) => {
            const rect = item.getBoundingClientRect()
            return rtl ? box.right - rect.right : rect.left - box.left
        })

        const distance = pageDelta({ containerWidth: box.width, cardWidth: items[0]!.getBoundingClientRect().width, leads }, direction, rtl)
        if (distance !== 0) element.scrollBy({ left: distance })
    }

    return (
        <div className="relative">
            {/* The controls sit at the top end-corner, tucked up into the section header's
                bottom margin, so they read as part of the heading row rather than as a
                footer under the cards. `justify-end` is logical: right in English, left in
                Arabic, which is where the "next" card comes from in RTL.

                Shown on touch too. Swiping still works and is what most people will do, but a
                pair of buttons is the only thing on a phone that SAYS the row continues past
                the edge of the screen — and on a narrow viewport `pageDelta` falls back to one
                card per press, which is the right step for a thumb. */}
            <div className="-mt-4 mb-5 flex items-center justify-end gap-2 lg:-mt-8">
                <PageButton label={t("previous")} onClick={() => page(-1)} direction="previous" />
                <PageButton label={t("next")} onClick={() => page(1)} direction="next" />
            </div>
            {/* The scrollbar is hidden, not removed: the track still scrolls by wheel, touch,
                and keyboard. `pb-2` is the breathing room for a card's focus ring, which the
                old `pb-4` was reserving for the scrollbar itself. */}
            <ul
                ref={track}
                className="hide-scrollbar scroll-smooth snap-x snap-mandatory -mx-5 flex gap-5 overflow-x-auto px-5 pb-2 lg:-mx-10 lg:px-10"
            >
                {products.map((product) => (
                    <li
                        key={product.id}
                        className="w-65 shrink-0 snap-start sm:w-75 lg:w-[320px]"
                    >
                        <Link
                            href={`/category/${product.categorySlug}/${product.subCategorySlug}/${product.slug}`}
                            className="block h-full"
                        >
                            <ProductCard
                                image={product.image}
                                title={product.name}
                                category={product.section}
                                price={product.price}
                                basePrice={product.basePrice}
                                discountPercent={product.discountPercent}
                            />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/** The offers section's original names — the same component, the same shape. */
export type OfferCard = CarouselCard
export const OffersCarousel = ProductCarousel

function PageButton({
    label,
    onClick,
    direction,
}: {
    label: string
    onClick: () => void
    direction: "previous" | "next"
}) {
    const Icon = direction === "next" ? ChevronRight : ChevronLeft

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-accent md:size-9"
        >
            <Icon aria-hidden className="size-4 rtl:-scale-x-100" />
        </button>
    )
}
