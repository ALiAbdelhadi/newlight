'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme()

    if (!mounted) {
        return (
            <button className="group rounded-lg p-2 transition-all duration-200" disabled>
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            onClick={toggleTheme}
            className="group rounded-lg p-2 transition-all duration-200 hover:bg-muted"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
