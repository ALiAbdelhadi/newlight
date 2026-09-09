"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/report-error"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportError(error, { boundary: "admin-global" })
    }, [error])

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                    background: "#fff",
                    color: "#111",
                }}
            >
                <main style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.4rem", fontWeight: 500 }}>The admin panel failed to start</h1>
                    <button
                        onClick={reset}
                        style={{
                            marginTop: "1.5rem",
                            padding: "0.6rem 1.4rem",
                            borderRadius: "0.4rem",
                            border: "1px solid #111",
                            background: "#111",
                            color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                    {error.digest && (
                        <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#666" }}>
                            Reference <code>{error.digest}</code>
                        </p>
                    )}
                </main>
            </body>
        </html>
    )
}
