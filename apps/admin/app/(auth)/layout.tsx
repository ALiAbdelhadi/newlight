import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <div className="relative top-4 right-4 container">
                <ThemeToggle />
            </div>
        </>
    )
}