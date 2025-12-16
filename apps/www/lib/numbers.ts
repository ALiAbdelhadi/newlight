export function convertToArabicNumerals(num: number): string {
    const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٤", "٥", "٢", "٩"]

    let result = num.toString()
    for (let i = 0; i < englishNumbers.length; i++) {
        result = result.replace(new RegExp(englishNumbers[i], "g"), arabicNumbers[i])
    }
    return result
}





export const createNumberFormatter = (locale: string) => {
    const formatter = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
        ...(locale.startsWith("ar") ? { numberingSystem: "arab" } : {}),
    })

    return (value: number | string) => {
        const num = typeof value === "number" ? value : Number(value)
        if (Number.isFinite(num)) return formatter.format(num)
        return value.toString()
    }
}
