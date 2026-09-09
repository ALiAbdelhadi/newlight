import { ThemedSignIn } from "@/components/theme-sign-in"

export default function SignInPage() {
    return (
        <main className="grid min-h-svh place-items-center bg-surface-sunk px-4 py-12">
            <div className="w-full max-w-[380px]">
                <div className="mb-6 flex items-center justify-center gap-2">
                    <div
                        aria-hidden
                        className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
                    >
                        N
                    </div>
                    <span className="text-sm font-semibold tracking-tight">NewLight</span>
                    <span className="rounded border px-1.5 py-px font-mono text-2xs text-muted-foreground">ERP</span>
                </div>

                <ThemedSignIn />

                <p className="mt-5 text-center text-2xs leading-relaxed text-muted-foreground">
                    Access is granted by an existing administrator.
                    <br />
                    There is no self-service sign-up.
                </p>
            </div>
        </main>
    )
}
