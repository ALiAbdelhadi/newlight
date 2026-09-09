import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import Image from "@/components/app-image"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export async function AuthSplit({
    headline,
    body,
    imageClassName,
    children,
}: {
    headline: string
    body: string
    imageClassName?: string
    children: ReactNode
}) {
    const [t, tNav] = await Promise.all([getTranslations("auth"), getTranslations("nav")])

    return (
        <main className="grid min-h-svh grid-cols-1 bg-background lg:grid-cols-12">
            <aside className="relative hidden overflow-hidden bg-muted lg:col-span-7 lg:block">
                <Image
                    src="/hero/hero.jpg"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1024px) 0px, 58vw"
                    className={cn("object-cover", imageClassName ?? "object-center")}
                />

                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/45 via-60% to-black/10"
                />

                <div className="hero-in relative z-10 flex h-full flex-col justify-end p-12 [--hero-delay:200ms] xl:p-16">
                    <div className="max-w-lg space-y-5">
                        <div aria-hidden className="h-px w-12 bg-on-media/60" />
                        <p className="font-display text-5xl leading-[1.05] text-balance text-on-media ltr:italic xl:text-6xl">
                            {headline}
                        </p>
                        <p className="text-base text-on-media-muted ltr:tracking-wide">{body}</p>
                    </div>
                </div>
            </aside>

            <div className="flex flex-col bg-card lg:col-span-5 lg:border-s">
                <div className="flex items-center justify-between gap-4 border-b px-6 py-5 sm:px-10">
                    <Link href="/" className="group flex shrink-0 items-baseline gap-1">
                        <span className="text-xl font-extrabold tracking-tighter uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast group-hover:tracking-tight">
                            {tNav("logoNew")}
                        </span>
                        <span className="text-xl font-light uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast ltr:tracking-wordmark ltr:group-hover:tracking-label">
                            {tNav("logoLight")}
                        </span>
                        <span className="sr-only">NewLight</span>
                    </Link>

                    <Link
                        href="/"
                        className="group inline-flex items-center gap-2 text-xs text-muted-foreground uppercase transition-colors duration-(--duration-fast) ltr:tracking-label hover:text-foreground"
                    >
                        <ArrowLeft
                            aria-hidden
                            className="size-3.5 transition-transform duration-(--duration-base) ease-out-fast group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
                        />
                        {t("backHome")}
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
                    <div className="hero-in w-full max-w-sm [--hero-delay:120ms]">{children}</div>
                </div>
            </div>
        </main>
    )
}

export async function AuthCentered({ children }: { children: ReactNode }) {
    const [t, tNav] = await Promise.all([getTranslations("auth"), getTranslations("nav")])

    return (
        <main className="flex min-h-svh flex-col items-center justify-center bg-surface-sunk px-5 py-16">
            <div className="hero-in w-full max-w-md [--hero-delay:120ms]">
                <Link href="/" className="group mb-8 flex items-baseline justify-center gap-1">
                    <span className="text-xl font-extrabold tracking-tighter uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast group-hover:tracking-tight">
                        {tNav("logoNew")}
                    </span>
                    <span className="text-xl font-light uppercase transition-[letter-spacing] duration-(--duration-base) ease-out-fast ltr:tracking-wordmark ltr:group-hover:tracking-label">
                        {tNav("logoLight")}
                    </span>
                    <span className="sr-only">NewLight</span>
                </Link>

                <div className="border bg-card p-6 sm:p-10">{children}</div>

                <div className="mt-6 flex justify-center">
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-2 text-xs text-muted-foreground uppercase transition-colors duration-(--duration-fast) ltr:tracking-label hover:text-foreground"
                    >
                        <ArrowLeft
                            aria-hidden
                            className="size-3.5 transition-transform duration-(--duration-base) ease-out-fast group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
                        />
                        {t("backHome")}
                    </Link>
                </div>
            </div>
        </main>
    )
}
