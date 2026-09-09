import Link from "next/link"

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
