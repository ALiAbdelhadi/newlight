'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const toggleTheme = () => {
        if (resolvedTheme === 'light') {
            setTheme('dark')
        } else {
            setTheme('light')
        }
    }

    // تجنب hydration mismatch عن طريق عرض نفس المحتوى على الـ server والـ client
    if (!mounted || !resolvedTheme) {
        return (
            <button 
                className="group rounded-lg p-2 transition-all duration-200" 
                disabled
                aria-label="Toggle theme"
            >
                <Sun className="h-5 w-5" />
                <span className="sr-only">Toggle theme</span>
            </button>
        )
    }

    return (
        <button
            onClick={toggleTheme}
            className="group rounded-lg p-2 transition-all duration-200 hover:bg-muted"
            aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
        >
            {resolvedTheme === 'light' ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
