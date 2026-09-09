import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/register-sw";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from '@/i18n/routing';
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/types";
import { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { Inter, Playfair_Display, Almarai } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

/**
 * Fonts.
 *
 * All three faces were being loaded and only one of them was reaching the page.
 * globals.css mapped `--font-sans` to `--font-geist-sans`, a variable defined
 * nowhere in this repository, so every `font-sans` utility resolved to nothing
 * and the storefront rendered in the browser's default UI face while Inter sat
 * downloaded and unused. Playfair was reached through `font-serif`, which is
 * Tailwind's GENERIC serif utility and not this variable, so the display type
 * was the browser's default serif too.
 *
 * The stacks are now assembled in globals.css from the LITERAL family names —
 * `Inter, Almarai, …` — not from these variables. That is load-bearing:
 * `var(--font-inter)` expands to `"Inter", "Inter Fallback"`, and that injected
 * fallback is a metric-adjusted local Arial, which HAS Arabic glyphs. It
 * therefore satisfies every Arabic codepoint before Almarai is consulted, and
 * the entire Arabic catalogue renders in Arial without anybody noticing.
 *
 * These calls stay because they are what emits the @font-face rules and
 * self-hosts the files; only the composition moved to CSS.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const almarai = Almarai({
  weight: ["400", "700"],
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-almarai",
})


export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const metadata = constructMetadata({
    locale: locale as SupportedLanguage
  })

  return {
    ...metadata,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "New Light",
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  }
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
      <html lang={locale} suppressHydrationWarning dir={locale === "ar" ? "rtl" : "ltr"} className={cn(inter.variable, playfair.variable, almarai.variable)}>
        {/* `dark:bg-card/60` is gone: the ground is a token, and a translucent card
            colour behind the whole document is not one. */}
        <body className="overflow-x-hidden scroll-smooth selection:bg-primary/20" suppressHydrationWarning>
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
            /*
             * The anti-flash script above reads `theme-preference`; next-themes
             * writes `theme` by default. The two never agreed, so a customer who
             * chose light on a dark machine got a dark flash on every navigation
             * and then a snap to light. Naming the key here makes them agree —
             * the same defect, and the same fix, as the admin panel.
             */
            storageKey="theme-preference"
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
  );
}
