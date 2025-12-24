import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { Almarai, Roboto } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";

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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          fontFamily: roboto.style.fontFamily,
          fontSize: "14px",
        },
      }}
    >
      <html suppressHydrationWarning >
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
            <Provider>
              {children}
            </Provider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
