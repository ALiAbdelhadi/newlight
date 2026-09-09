import { ThemeToggle } from "@/components/theme-toggle"

/**
 * The unauthenticated shell.
 *
 * The theme control was `relative top-4 right-4 container` AFTER `{children}` in the flow, so
 * on a full-height sign-in page it landed below the fold and pushed the document taller than
 * the viewport. It is pinned now, which is what "top right" meant.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <div className="fixed top-3 right-3 z-10">
                <ThemeToggle />
            </div>
        </>
    )
}
