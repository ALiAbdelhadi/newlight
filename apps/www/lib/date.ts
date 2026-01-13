const arabicMonths = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
]

export function formatDate(date: Date, locale: string): string {
    if (locale === "ar") {
        const day = date.getDate()
        const month = arabicMonths[date.getMonth()]
        const year = date.getFullYear()
        return `${day} ${month}، ${year}`
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date)
}
