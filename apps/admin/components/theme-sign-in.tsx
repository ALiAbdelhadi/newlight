"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"

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

        if (result.error) return setError("Email or password is incorrect.")

        router.push("/admin/dashboard")
        router.refresh()
    }

    return (
        <div className="w-full rounded-lg border bg-card p-6">
            <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 mb-5 text-xs text-muted-foreground">
                Access is granted by an existing administrator. There is no self-service sign-up.
            </p>

            <form onSubmit={onSubmit} noValidate>
                {error ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger"
                    >
                        {error}
                    </p>
                ) : null}

                <div className="mb-3 space-y-1">
                    <Label htmlFor="email" className="text-xs">
                        Email address
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="mb-4 space-y-1">
                    <Label htmlFor="password" className="text-xs">
                        Password
                    </Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    disabled={pending}
                    size="sm"
                    className="w-full"
                >
                    {pending ? "Please wait…" : "Sign in"}
                </Button>
            </form>
        </div>
    )
}
