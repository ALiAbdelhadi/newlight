import { ThemedSignIn } from "@/components/theme-sign-in"

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
