import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Signed in, but not an administrator.
 *
 * Rebuilt on the tokens. The version this replaces painted `bg-[#f8f8f8] dark:bg-[#000]` and
 * `text-[#1d1d1f] dark:text-white` — four hardcoded colours no token could reach — set its
 * heading in `text-5xl`, which globals.css removes, and linked to `/auth/sign-in`, which is
 * not a route in this application. The route is `/sign-in`.
 *
 * It states the restriction and nothing about what is behind it: telling somebody without
 * access what they are missing is a description of the data they cannot see.
 */
export default function UnauthorizedPage() {
    return (
        <main className="grid min-h-screen place-items-center bg-surface-sunk px-4">
            <div className="max-w-md text-center">
                <Lock aria-hidden className="mx-auto size-5 text-muted-foreground" />
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">You do not have access to this</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    This panel is limited to administrators. If you should have access, ask an existing
                    administrator to grant it to your account.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                    <Button asChild size="sm">
                        <Link href="/sign-in">Sign in as somebody else</Link>
                    </Button>
                </div>
            </div>
        </main>
    )
}
