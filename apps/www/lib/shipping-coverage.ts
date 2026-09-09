/**
 * Where the published shipping rates actually apply.
 *
 * The three rates in `SystemSetting` are Cairo and Giza prices. Everywhere else in Egypt is
 * quoted per order — the cost depends on the volume being moved — and confirmed with the
 * customer within 24 hours of the order being placed.
 *
 * That was true before this file existed and the storefront did not say it, which is the
 * problem: a customer in Alexandria read "100 EGP", ordered, and found out afterwards. A price
 * with an unstated condition is not a price.
 *
 * WHAT THIS IS NOT: it is not a second rate table. Nothing here computes a price for an
 * uncovered address, because nothing in the system knows one — the order is still recorded at
 * the standard rate and the real figure is agreed by a person. This module only decides which
 * of the two sentences a customer should be reading.
 */

/**
 * The covered governorates, in every spelling a customer plausibly types.
 *
 * The checkout's governorate field is free text, so this matches rather than looks up. Matching
 * is deliberately generous: the cost of accepting "Cairo, Egypt" is nothing, and the cost of
 * rejecting it is telling a Cairo customer their price is provisional when it is not.
 */
const COVERED = [
    // Cairo
    "cairo",
    "القاهرة",
    "القاهره",
    "قاهرة",
    "قاهره",
    // Giza
    "giza",
    "gizah",
    "el giza",
    "al giza",
    "الجيزة",
    "الجيزه",
    "جيزة",
    "جيزه",
] as const

/** Arabic diacritics and the tatweel, which a customer's keyboard may or may not produce. */
const ARABIC_MARKS = /[ً-ْـ]/g

function normalise(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(ARABIC_MARKS, "")
        // أ إ آ → ا, ى → ي, ة → ه: the four substitutions that account for almost every
        // spelling difference in an Egyptian address field.
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, " ")
}

/**
 * Is this governorate one the published rates cover?
 *
 * An EMPTY value is covered, and that is the deliberate answer rather than an oversight: the
 * field is empty because the customer has not typed yet, and warning somebody about a decision
 * they have not made is how a form teaches people to ignore it. The standing note next to the
 * rates is what covers that moment.
 */
export function isCoveredGovernorate(value: string | null | undefined): boolean {
    if (!value || !value.trim()) return true
    const text = normalise(value)
    return COVERED.some((name) => text.includes(normalise(name)))
}
