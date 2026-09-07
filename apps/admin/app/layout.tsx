import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Almarai, Roboto } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

/**
 * Fonts (P4.5 §3.1).
 *
 * Both faces were already loaded here and both were applied to <body> as class
 * names — two competing `font-family` declarations with undefined resolution
 * order. Meanwhile globals.css mapped `--font-sans` to `--font-geist-sans`, a
 * variable defined nowhere in the repository, so every `font-sans` utility in
 * the admin resolved to nothing at all.
 *
 * The fix is one stack with per-glyph fallback: Roboto covers Latin, Almarai
 * fills the Arabic codepoints Roboto lacks. There is no `:lang()` tagging,
 * because the panel cannot know a string's language — it renders whatever the
 * catalogue holds, and half of it is Arabic.
 *
 * The stack is assembled in globals.css from the LITERAL family names, not
 * from `var(--font-roboto)`. That variable expands to
 * `"Roboto", "Roboto Fallback"`, and the fallback is a metric-adjusted local
 * Arial — which has Arabic glyphs, and therefore satisfies every Arabic
 * codepoint before Almarai is reached. Measured in the browser: an Arabic
 * product name set at 293px through that stack and 406px through Almarai. The
 * whole catalogue's Arabic was rendering in Arial, invisibly.
 *
 * `adjustFontFallback: false` does not help — Turbopack has its own font
 * implementation and ignores it — so the option is deliberately absent here
 * rather than present and doing nothing.
 *
 * These two calls stay because they are what emits the @font-face rules and
 * self-hosts the files; only the composition moved to CSS.
 */
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const almarai = Almarai({
  weight: ["400", "700"],
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-almarai",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * The `.variable` classes go on <html> rather than <body>: they are what
     * attaches next/font's generated stylesheet, and putting them at the root
     * keeps `--font-roboto` / `--font-almarai` resolvable from `:root` for any
     * rule that still wants the metric-adjusted variants.
     */
    <html lang="en" className={cn(roboto.variable, almarai.variable)} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
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
           * The anti-flash script above reads `theme-preference`, but
           * next-themes writes `theme` by default — so the script never found a
           * stored choice and always fell back to the OS preference. An
           * operator who picked light on a dark machine got a dark flash on
           * every navigation, then a snap to light. Naming the key here makes
           * the two agree; §3.8 forbids leaving dark mode half-wired.
           */
          storageKey="theme-preference"
        >
          <Provider>
            {children}
            {/*
                This was missing, and the component existed the whole time.

                Every `toast.success` and `toast.error` in the admin panel went nowhere —
                the price editor, the spec editor, image upload, stock adjustments, and every
                refusal message written to explain WHY something was refused. An action would
                either work silently or fail silently, which is the one thing the ui-ux-pro-max
                Forms/Submit Feedback rule (severity HIGH) says not to do.

                Found by clicking Archive on a sub-category holding 13 products: the service
                correctly refused and named the count, and the person clicking saw nothing at
                all.
              */}
            <Toaster />
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
