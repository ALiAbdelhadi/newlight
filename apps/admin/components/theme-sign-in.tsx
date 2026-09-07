"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"

/**
 * The admin sign-in form.
 *
 * English only and deliberately so: the admin app is internal and English-only by design.
 * There is no "create an account" link, because there is no sign-up route and the API refuses
 * registration too — the first SUPER_ADMIN is seeded by
 * `pnpm --filter @repo/database seed:super-admin`.
 */
export function ThemedSignIn() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setPending(true)

        const form = new FormData(event.currentTarget)
        const result = await signIn.email({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
        })
        setPending(false)

        // One message for every failure. Distinguishing "no such account" from "wrong
        // password" on an admin login tells an attacker which addresses are worth attacking.
        if (result.error) return setError("Email or password is incorrect.")

        router.push("/admin/dashboard")
        router.refresh()
    }

    return (
        <div className="w-full border border-border p-6 sm:p-8">
            <h1 className="text-2xl font-light tracking-[0.05em] text-foreground">Sign in</h1>
            <p className="mt-2 mb-6 text-sm font-light tracking-[0.05em] text-muted-foreground">
                Newlight admin. Access is granted by an existing administrator.
            </p>

            <form onSubmit={onSubmit} noValidate>
                {error ? (
                    <p role="alert" className="mb-4 border-s-2 border-destructive py-2 ps-3 text-sm text-destructive">
                        {error}
                    </p>
                ) : null}

                <div className="mb-4 space-y-2">
                    <Label htmlFor="email" className="text-sm font-normal tracking-[0.05em]">
                        Email address
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="rounded-none border-border bg-primary/5 transition-all duration-300 focus-visible:border-primary focus-visible:bg-primary/10"
                    />
                </div>

                <div className="mb-4 space-y-2">
                    <Label htmlFor="password" className="text-sm font-normal tracking-[0.05em]">
                        Password
                    </Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="rounded-none border-border bg-primary/5 transition-all duration-300 focus-visible:border-primary focus-visible:bg-primary/10"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-none text-sm font-medium tracking-[0.05em] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-70"
                >
                    {pending ? "Please wait…" : "Sign in"}
                </Button>
            </form>
        </div>
    )
}
