const COVERED = [
    "cairo",
    "القاهرة",
    "القاهره",
    "قاهرة",
    "قاهره",
    "giza",
    "gizah",
    "el giza",
    "al giza",
    "الجيزة",
    "الجيزه",
    "جيزة",
    "جيزه",
] as const

const ARABIC_MARKS = /[ً-ْـ]/g

function normalise(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(ARABIC_MARKS, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, " ")
}

export function isCoveredGovernorate(value: string | null | undefined): boolean {
    if (!value || !value.trim()) return true
    const text = normalise(value)
    return COVERED.some((name) => text.includes(normalise(name)))
}
