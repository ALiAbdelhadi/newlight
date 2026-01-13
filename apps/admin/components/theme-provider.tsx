"use client"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props} disableTransitionOnChange storageKey="theme-preference" attribute="class">
            {children}
        </NextThemesProvider>
    )
}
