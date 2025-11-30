import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { convertToArabicNumerals } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("footer");
    const locale = useLocale();

    const currentYear = new Date().getFullYear();
    const localizedYear = locale === "ar"
        ? convertToArabicNumerals(currentYear)
        : currentYear;

    return (
        <footer className="border-t border-border bg-card/60 backdrop-blur-xl supports-backdrop-filter:bg-card/80">
            <Container>
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center space-x-1">
                                <h1 className="text-2xl font-extrabold tracking-wider text-primary uppercase">
                                    {t("logo.part1")}
                                </h1>
                                <p className="text-2xl font-light tracking-widest uppercase">
                                    {t("logo.part2")}
                                </p>
                            </div>
                        </div>
                        <div>
                            <h5 className="text-sm uppercase tracking-wider mb-4 text-foreground">
                                {t("sections.products.title")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link href="/indoor" className="hover:text-foreground transition-colors">
                                        {t("sections.products.indoor")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/outdoor" className="hover:text-foreground transition-colors">
                                        {t("sections.products.outdoor")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground transition-colors">
                                        {t("sections.products.smart")}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-sm uppercase tracking-wider mb-4 text-foreground">
                                {t("sections.resources.title")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link href="/catalog" className="hover:text-foreground transition-colors">
                                        {t("sections.resources.catalog")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground transition-colors">
                                        {t("sections.resources.technical")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground transition-colors">
                                        {t("sections.resources.installation")}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-sm uppercase tracking-wider mb-4 text-foreground">
                                {t("sections.company.title")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link href="/about" className="hover:text-foreground transition-colors">
                                        {t("sections.company.about")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="hover:text-foreground transition-colors">
                                        {t("sections.company.contact")}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                        &copy;{" "}
                        {localizedYear}{" "}
                        {t("copyright")}
                    </div>
                </div>
            </Container>
        </footer>
    );
}