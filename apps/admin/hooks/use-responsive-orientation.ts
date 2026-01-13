"use client"

import { useEffect, useState } from "react"

export function useResponsiveOrientation() {
    const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal")

    useEffect(() => {
        const checkScreenSize = () => {
            // Use 768px as breakpoint (md in Tailwind)
            if (window.innerWidth < 768) {
                setOrientation("vertical")
            } else {
                setOrientation("horizontal")
            }
        }

        // Check on mount
        checkScreenSize()

        // Add event listener for resize
        window.addEventListener("resize", checkScreenSize)

        // Cleanup
        return () => window.removeEventListener("resize", checkScreenSize)
    }, [])

    return orientation
}
