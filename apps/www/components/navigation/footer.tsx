import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { getFooterSubCategories } from "@/lib/db";
import { convertToArabicNumerals } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";

export async function Footer() {
    const t = await getTranslations("footer");
    const locale = await getLocale();

    const subCategories = await getFooterSubCategories(locale as "en" | "ar");

    const indoorSubCategories = subCategories.filter(
        (sub) => sub.categoryType === "indoor"
    );
    const outdoorSubCategories = subCategories.filter(
        (sub) => sub.categoryType === "outdoor"
    );

    const currentYear = new Date().getFullYear();
    const localizedYear =
        locale === "ar" ? convertToArabicNumerals(currentYear) : currentYear;

    return (
        <footer className="border-t border-border bg-card/60 backdrop-blur-xl supports-backdrop-filter:bg-card/80">
            <Container>
                <div className="py-12">
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
                                {t("sections.products.indoor")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                {indoorSubCategories.length > 0 ? (
                                    indoorSubCategories.map((subCategory) => (
                                        <li key={subCategory.id}>
                                            <Link
                                                href={`/category/indoor/${subCategory.slug}`}
                                                className="hover:text-foreground transition-colors"
                                            >
                                                {subCategory.name}
                                            </Link>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-muted-foreground/70">
                                        {t("sections.products.noSubCategories")}
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-sm uppercase tracking-wider mb-4 text-foreground">
                                {t("sections.products.outdoor")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                {outdoorSubCategories.length > 0 ? (
                                    outdoorSubCategories.map((subCategory) => (
                                        <li key={subCategory.id}>
                                            <Link
                                                href={`/category/outdoor/${subCategory.slug}`}
                                                className="hover:text-foreground transition-colors"
                                            >
                                                {subCategory.name}
                                            </Link>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-muted-foreground/70">
                                        {t("sections.products.noSubCategories")}
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-sm uppercase tracking-wider mb-4 text-foreground">
                                {t("sections.company.title")}
                            </h5>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link
                                        href="/about"
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {t("sections.company.about")}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/contact"
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {t("sections.company.contact")}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/privacy"
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {t("sections.company.privacy")}
                                    </Link>
                                </li>
                                {/* <li>
                                    <Link
                                        href="/faqs"
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {t("sections.company.faqs")}
                                    </Link>
                                </li> */}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                        &copy; {localizedYear} {t("copyright")}
                    </div>
                </div>
            </Container>
        </footer>
    );
}