export interface ErrorContext {
    boundary: string
    [key: string]: unknown
}

export function reportError(error: unknown, context: ErrorContext): void {
    try {
        const detail = {
            message: error instanceof Error ? error.message : String(error),
            digest: error instanceof Error ? (error as Error & { digest?: string }).digest : undefined,
            stack: error instanceof Error ? error.stack : undefined,
            url: typeof window !== "undefined" ? window.location.href : undefined,
            at: new Date().toISOString(),
            ...context,
        }
        console.error("[error]", detail)

    } catch {
    }
}
