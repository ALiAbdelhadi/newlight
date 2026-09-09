const CARRIER: Record<string, string> = {
    "أ": "ا",
    "إ": "ا",
    "آ": "ا",
    "ٱ": "ا",
    "ئ": "ي",
    "ؤ": "و",
    "ى": "ي",
    "ة": "ه",
}

const DIACRITICS = /[ً-ٰٟـ]/g

const ARABIC_INDIC_ZERO = 0x0660

const ALLOWED = /[^a-z0-9ء-غف-ي]+/g

export function normalizeArabic(input: string): string {
    let out = input.normalize("NFC").replace(DIACRITICS, "")
    out = out.replace(/[أإآٱئؤىة]/g, (ch) => CARRIER[ch] ?? ch)
    out = out.replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - ARABIC_INDIC_ZERO))
    return out
}

export function slugify(input: string): string {
    if (!input) return ""
    let out = input.trim().toLowerCase()
    out = out.replace(/[×✕✖]/g, "x")
    out = normalizeArabic(out)
    out = out.replace(ALLOWED, "-")
    return out.replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-")
}

export function requireSlug(input: string, context: string): string {
    const slug = slugify(input)
    if (!slug) {
        throw new Error(`requireSlug(): ${JSON.stringify(input)} produces an empty slug (${context})`)
    }
    return slug
}

export function uniqueSlug(input: string, taken: ReadonlySet<string>, context: string): string {
    const base = requireSlug(input, context)
    if (!taken.has(base)) return base
    for (let n = 2; n < 1000; n++) {
        const candidate = `${base}-${n}`
        if (!taken.has(candidate)) return candidate
    }
    throw new Error(`uniqueSlug(): could not find a free slug for ${JSON.stringify(input)} (${context})`)
}

export function encodeSlug(slug: string): string {
    return encodeURIComponent(slug)
}

export function decodeSlug(segment: string): string {
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}
