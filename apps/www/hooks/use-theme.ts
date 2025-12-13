"use client"

import { useLayoutEffect, useState } from "react"

type Theme = "light" | "dark"

export function useTheme() {
    const [theme, setTheme] = useState<Theme | null>(null)
    const [mounted, setMounted] = useState(false)

    // useLayoutEffect runs synchronously before the browser paints, preventing theme flicker
    useLayoutEffect(() => {
        const stored = localStorage.getItem("theme") as Theme | null
        const preferred = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")

        setTheme(preferred)
        document.documentElement.classList.toggle("dark", preferred === "dark")
        setMounted(true)
    }, [])

    const toggleTheme = () => {
        if (theme === null) return

        const newTheme = theme === "light" ? "dark" : "light"
        setTheme(newTheme)
        localStorage.setItem("theme", newTheme)
        document.documentElement.classList.toggle("dark", newTheme === "dark")
    }

    return { theme, toggleTheme, mounted }
}
