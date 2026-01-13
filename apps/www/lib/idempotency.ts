import crypto from "crypto"

/**
 * Generate deterministic idempotency key
 * This ensures the same inputs always generate the same key
 */
export function generateIdempotencyKey(
    userId: string,
    configurationId: string,
    version: string = "v1"
): string {
    const data = `${userId}-${configurationId}-${version}`

    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex')
}

/**
 * Generate unique session-based key (for frontend)
 */
export function generateSessionKey(
    userId: string,
    configurationId: string
): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const data = `${userId}-${configurationId}-${timestamp}-${random}`

    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex')
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
    // SHA-256 hex is 64 characters
    return /^[a-f0-9]{64}$/i.test(key)
}