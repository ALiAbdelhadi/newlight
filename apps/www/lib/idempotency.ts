import crypto from "crypto"

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

export function isValidIdempotencyKey(key: string): boolean {
    return /^[a-f0-9]{64}$/i.test(key)
}