import Image from "@/components/app-image"
import { getLocale, getTranslations } from "next-intl/server"

import { encodeSlug, resolveLocale } from "@repo/database"

import { Link } from "@/i18n/navigation"
import { CategoryService } from "@/lib/services/category-service"
import { DirectionalArrow } from "@/components/directional-arrow"
import { cn } from "@/lib/utils"

const TILE_IMAGE = ["/category/indoor-lighting-1.png", "/category/outdoor-lighting-1.png"]

export async function Hero() {
    const t = await getTranslations("hero-section")
    const locale = resolveLocale(await getLocale())

    const categories = (await CategoryService.getAllCategories(locale)).slice(0, 2)

    return (
        <>
            <section className="-mt-16 grid min-h-[80svh] grid-cols-1 border-b pt-16 lg:grid-cols-12">
                <div className="order-2 flex flex-col justify-center px-5 py-14 lg:order-1 lg:col-span-5 lg:px-12 lg:py-24 xl:px-16">
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

                <div className="relative order-1 min-h-[42svh] overflow-hidden lg:order-2 lg:col-span-7 lg:min-h-0">
                    <Image
                        src="/hero/hero.jpg"
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="hero-media object-cover object-center"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-background/8 bg-gradient-to-t from-background/45 via-background/8 to-transparent"
                    />
                </div>
            </section>

            {categories.length > 0 && (
                <section aria-label={t("browseCatalogue")} className="grid grid-cols-1 border-b sm:grid-cols-2">
                    {categories.map((category, index) => {
                        const translation = category.translations[0]
                        if (!translation) return null
                        return (
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
                <DirectionalArrow variant="circled" className="border-background/40 text-background" />
            </span>
        </Link>
    )
}
