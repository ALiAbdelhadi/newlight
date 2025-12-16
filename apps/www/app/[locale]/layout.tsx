import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/register-sw";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from '@/i18n/routing';
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/types";
import { ClerkProvider } from "@clerk/nextjs";
import { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { Almarai, Roboto } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

const roboto = Roboto({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const almarai = Almarai({
  weight: "400",
  subsets: ["arabic"],
  display: "swap",
})

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return constructMetadata({
    locale: locale as SupportedLanguage
  })
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return (
    <ClerkProvider
      appearance={{
        variables: {
          fontFamily: roboto.style.fontFamily,
          fontSize: "14px",
        },
      }}
    >
      <html lang={locale} suppressHydrationWarning dir={locale === "ar" ? "rtl" : "ltr"} >
        <body className={cn(roboto.className, almarai.className, "antialiased overflow-x-hidden scroll-smooth bg-card")} suppressHydrationWarning>
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `
              try {
                const theme = localStorage.getItem('theme-preference');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
                if (shouldBeDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
            }}
          />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider>
              <Providers>
                {children}
                <RegisterServiceWorker />
              </Providers>
              <Toaster />
            </NextIntlClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
