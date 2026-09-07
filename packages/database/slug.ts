/**
 * Slugs.
 *
 * Migration 0002 moved slugs onto the translation rows, so Arabic taxonomy URLs are real
 * URLs rather than English paths serving Arabic content. Those Arabic slugs are GENERATED
 * from the Arabic names, and this module is the generator. It is the only one: a slug
 * produced by a second implementation would collide with, or fail to match, the first.
 *
 * The normalisation rule (BUILD §9.2 / §14.6, amendment A6):
 *
 *   A HAMZA-BEARING LETTER REDUCES TO ITS CARRIER.
 *     أ إ آ ٱ -> ا      ئ -> ي      ؤ -> و      ى -> ي      ة -> ه
 *
 *   Bare ء (U+0621) has NO carrier and is left intact. Mapping it to ا turns إضاءة into
 *   اضااه and contradicts the approved reference output اضاءه-cob. This is the single most
 *   common way to get this rule wrong, so it is stated as a rule rather than an exception.
 *
 *   Latin fragments stay inline, lowercased, and are NOT transliterated: the market
 *   searches for "COB", "SMD", "LED" in Latin script, so إضاءة COB becomes اضاءه-cob.
 *
 *   × normalises to x IN THE SLUG ONLY. Display names keep the multiplication sign.
 *
 *   Whitespace is trimmed before generation. A slug derived from an untrimmed name is a
 *   defect in new data, so this is the one place existing data is cleaned rather than
 *   carried across verbatim (amendment A9).
 *
 * Two additions beyond A6, both about characters that are invisible or ambiguous in a URL
 * and neither of which changes the approved reference outputs:
 *   - Arabic diacritics (tashkeel) and tatweel are removed. Two slugs differing only by an
 *     invisible fatha are two different URLs that look identical.
 *   - Arabic-Indic digits ٠-٩ fold to 0-9, so a size reads the same in both languages.
 */

/** Hamza-bearing letters and their carriers. Bare ء is deliberately absent. */
const CARRIER: Record<string, string> = {
    "أ": "ا", // أ  alef with hamza above
    "إ": "ا", // إ  alef with hamza below
    "آ": "ا", // آ  alef with madda
    "ٱ": "ا", // ٱ  alef wasla
    "ئ": "ي", // ئ  yeh with hamza
    "ؤ": "و", // ؤ  waw with hamza
    "ى": "ي", // ى  alef maksura
    "ة": "ه", // ة  teh marbuta
}

/** U+064B-U+065F and U+0670: tashkeel. U+0640: tatweel, a pure typographic stretch. */
const DIACRITICS = /[ً-ٰٟـ]/g

const ARABIC_INDIC_ZERO = 0x0660

/** What may appear in a slug: Latin alphanumerics and unpointed Arabic letters. */
const ALLOWED = /[^a-z0-9ء-غف-ي]+/g

/**
 * Normalise a string the way slug generation does, WITHOUT joining it into a slug.
 * Exposed because search and duplicate detection have to compare the same way slugs do.
 */
export function normalizeArabic(input: string): string {
    let out = input.normalize("NFC").replace(DIACRITICS, "")
    out = out.replace(/[أإآٱئؤىة]/g, (ch) => CARRIER[ch] ?? ch)
    out = out.replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - ARABIC_INDIC_ZERO))
    return out
}

/**
 * Generate a slug. Returns "" for input that contains nothing sluggable, which callers must
 * treat as an error rather than store — an empty slug is a URL collision waiting to happen.
 */
export function slugify(input: string): string {
    if (!input) return ""
    let out = input.trim().toLowerCase()
    out = out.replace(/[×✕✖]/g, "x") // × ✕ ✖ -> x, slug only
    out = normalizeArabic(out)
    out = out.replace(ALLOWED, "-")
    return out.replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-")
}

/**
 * Slug for a name, refusing to invent one. Use at every write path: a taxonomy row whose
 * name yields no slug must fail loudly, because (locale, slug) is UNIQUE and an empty
 * string would take the one slot every other unsluggable name also wants.
 */
export function requireSlug(input: string, context: string): string {
    const slug = slugify(input)
    if (!slug) {
        throw new Error(`requireSlug(): ${JSON.stringify(input)} produces an empty slug (${context})`)
    }
    return slug
}

/**
 * Append a numeric suffix until the slug is unique within `taken`. Deterministic, so the
 * same input against the same set always produces the same answer.
 */
export function uniqueSlug(input: string, taken: ReadonlySet<string>, context: string): string {
    const base = requireSlug(input, context)
    if (!taken.has(base)) return base
    for (let n = 2; n < 1000; n++) {
        const candidate = `${base}-${n}`
        if (!taken.has(candidate)) return candidate
    }
    throw new Error(`uniqueSlug(): could not find a free slug for ${JSON.stringify(input)} (${context})`)
}

/**
 * Percent-encode at the URL boundary, and ONLY there. Arabic slugs are stored and compared
 * as Arabic; they are encoded when written into an href and decoded on the way back in.
 * Encoding on the way into the database would make every stored slug locale-dependent
 * mojibake that no admin could read.
 */
export function encodeSlug(slug: string): string {
    return encodeURIComponent(slug)
}

export function decodeSlug(segment: string): string {
    try {
        return decodeURIComponent(segment)
    } catch {
        // A malformed percent-escape is untrusted input from a URL, not a crash.
        return segment
    }
}
