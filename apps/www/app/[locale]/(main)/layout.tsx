import { Footer } from "@/components/navigation/footer";
import { Nav } from "@/components/navigation/nav";
import { SupportedLanguage } from "@/types";

export default function MainLayout({ children, params }: { children: React.ReactNode, params: Promise<{ locale: SupportedLanguage }> }) {
    return (
        <>
            <Nav />
            <main role="main">{children}</main>
            <Footer />
        </>
    )
}