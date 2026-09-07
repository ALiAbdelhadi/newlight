/**
 * One place client-side errors go.
 *
 * There is no error reporting service wired up — Sentry was deferred in P3 for want of a DSN
 * and never revisited. This is deliberately NOT a fake one: it does what can be done
 * today, which is to put a structured, findable record in the browser console, and it is the
 * single call site a real reporter would replace.
 *
 * It never throws. A reporter that can break the error page it is reporting from is worse than
 * no reporter.
 */
export interface ErrorContext {
    boundary: string
    [key: string]: unknown
}

export function reportError(error: unknown, context: ErrorContext): void {
    try {
        const detail = {
            message: error instanceof Error ? error.message : String(error),
            // Next assigns this to server-side errors; it is what ties this to a server log line.
            digest: error instanceof Error ? (error as Error & { digest?: string }).digest : undefined,
            stack: error instanceof Error ? error.stack : undefined,
            url: typeof window !== "undefined" ? window.location.href : undefined,
            at: new Date().toISOString(),
            ...context,
        }
        console.error("[error]", detail)

        // WHEN A DSN EXISTS: forward `detail` here, and nowhere else. Keeping it to one
        // function is the whole point — every boundary already calls this.
    } catch {
        // Reporting failed. The page still has to render.
    }
}
