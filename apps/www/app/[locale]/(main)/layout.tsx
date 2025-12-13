import { Footer } from "@/components/navigation/footer";
import { Nav } from "@/components/navigation/nav";

export default function MainLayout({ children, }: { children: React.ReactNode }) {
    return (
        <>
            <Nav />
            <main role="main">{children}</main>
            <Footer />
        </>
    )
}