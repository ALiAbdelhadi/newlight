import Link from "next/link"

/**
 * The 404 for a URL that matches no route at all.
 *
 * The app HAS a designed not-found page — `[locale]/not-found.tsx`, animated, translated — but
 * it only fires for an explicit `notFound()` inside a matched route. A mistyped URL never
 * reaches the `[locale]` segment, so it fell through to Next's own page: "404 · This page could
 * not be found", unstyled, in English, on an Arabic site.
 *
 * This one cannot use next-intl either — there is no locale to read, which is the whole reason
 * it is being rendered — so it says it in both languages and links to both, and lets the
 * visitor pick. That is more useful than guessing and being wrong half the time.
 */
export default function RootNotFound() {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem",
                    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                    background: "#fff",
                    color: "#111",
                }}
            >
                <main style={{ textAlign: "center", maxWidth: "30rem" }}>
                    <p style={{ fontSize: "3rem", fontWeight: 300, margin: 0, letterSpacing: "0.05em" }}>404</p>

                    <p style={{ margin: "1rem 0 0", color: "#555" }}>This page does not exist.</p>
                    <p dir="rtl" style={{ margin: "0.25rem 0 2rem", color: "#555" }}>الصفحة دي مش موجودة.</p>

                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <Link
                            href="/en"
                            style={{
                                padding: "0.6rem 1.4rem",
                                borderRadius: "0.4rem",
                                background: "#111",
                                color: "#fff",
                                textDecoration: "none",
                                fontSize: "0.95rem",
                            }}
                        >
                            English
                        </Link>
                        <Link
                            href="/ar"
                            style={{
                                padding: "0.6rem 1.4rem",
                                borderRadius: "0.4rem",
                                border: "1px solid #111",
                                color: "#111",
                                textDecoration: "none",
                                fontSize: "0.95rem",
                            }}
                        >
                            العربية
                        </Link>
                    </div>
                </main>
            </body>
        </html>
    )
}
