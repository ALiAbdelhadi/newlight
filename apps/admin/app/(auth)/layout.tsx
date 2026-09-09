import { ThemeToggle } from "@/components/theme-toggle"

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
