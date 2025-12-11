export function convertArabicToEnglishNumbers(str: string): string {
    if (!str) return ""

    const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    let result = str.toString()
    for (let i = 0; i < arabicNumbers.length; i++) {
        result = result.replace(new RegExp(arabicNumbers[i], "g"), englishNumbers[i])
    }
    return result
}




