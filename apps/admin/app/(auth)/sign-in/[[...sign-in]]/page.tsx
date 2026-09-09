import { ThemedSignIn } from "@/components/theme-sign-in"

/**
 * Admin sign-in.
 *
 * What stood here was the storefront's sign-in, moved across whole: a full-bleed hero
 * photograph, a GSAP timeline fading three refs in, a 48px "Welcome back" over the words
 * "Sign in to continue shopping and managing your orders", and a `backdrop-blur` panel. This
 * is an internal tool — nobody signing into it is shopping, and nobody needs to be sold the
 * product they are about to administer.
 *
 * It also loaded `gsap` on the one route an operator sees before they have a session, to
 * animate an opacity, and its headings used `text-5xl` — a utility globals.css sets to
 * `initial`, i.e. removes — so they rendered at the inherited 13px anyway.
 *
 * A server component now. There is nothing on it that needs the client except the form, which
 * is its own boundary.
 */
export default function SignInPage() {
    return (
        <main className="grid min-h-screen place-items-center bg-surface-sunk px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex items-center gap-2">
                    <div
                        aria-hidden
                        className="grid size-6 place-items-center rounded-sm bg-primary text-xs font-bold text-primary-foreground"
                    >
                        N
                    </div>
                    <span className="text-sm font-semibold tracking-tight">NewLight</span>
                    <span className="rounded border px-1 py-px font-mono text-2xs text-muted-foreground">ERP</span>
                </div>

                <ThemedSignIn />
            </div>
        </main>
    )
}
