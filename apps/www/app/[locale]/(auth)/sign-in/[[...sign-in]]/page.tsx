import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { ArrowLeft } from "lucide-react"
import Image from "@/components/app-image"

import { Container } from "@/components/layout/section"
import { ThemedSignIn } from "@/components/theme-sign-in"
import { Link } from "@/i18n/navigation"

/**
 * Sign in.
 *
 * A SERVER COMPONENT. The GSAP timeline it replaces set the photograph, the form and the back
 * link to `opacity: 0` on mount — so on a slow connection the sign-in page had no sign-in form
 * on it — and it ran regardless of `prefers-reduced-motion`, because GSAP writes inline styles
 * a media query cannot reach.
 *
 * THE COPY WAS HARDCODED ENGLISH. "Back to Home", "Welcome back", "Sign in to continue shopping
 * and managing your orders" and "Loading..." were literals on a page served at `/ar` as well,
 * so an Arabic customer signing in read four English sentences. They come from the message
 * catalogue now, like the rest of the storefront.
 */
export default async function SignInPage() {
    const t = await getTranslations("auth")

    return (
        <div className="pt-24 pb-12 text-foreground">
            <Container>
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm font-light tracking-wide transition-colors duration-(--duration-fast) hover:text-primary"
                >
                    {/* Back navigation keeps a back arrow — a different meaning from the
                        catalogue's forward arrow, and one of the documented exceptions. */}
                    <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />
                    {t("backHome")}
                </Link>

                <div className="mx-auto max-w-6xl">
                    <div className="grid grid-cols-1 overflow-hidden rounded-lg border lg:grid-cols-2">
                        <div className="relative hidden min-h-[600px] overflow-hidden bg-muted lg:block">
                            <Image
                                src="/hero/hero.jpg"
                                alt=""
                                fill
                                sizes="(max-width: 1024px) 0px, 50vw"
                                className="object-cover"
                            />
                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-12">
                                <div className="space-y-4">
                                    <p className="font-display text-4xl font-light tracking-tight text-background">
                                        {t("welcomeBack")}
                                    </p>
                                    <p className="text-lg font-light tracking-wide text-background/75">
                                        {t("welcomeBackBody")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-card p-6 sm:p-10">
                            <div className="w-full max-w-sm">
                                <Suspense
                                    fallback={
                                        <div
                                            role="status"
                                            aria-live="polite"
                                            className="flex items-center justify-center py-16"
                                        >
                                            <span className="text-sm font-light text-muted-foreground">
                                                {t("loading")}
                                            </span>
                                        </div>
                                    }
                                >
                                    <ThemedSignIn />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}
