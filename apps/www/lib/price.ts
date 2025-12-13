
export function formatNumberWithConversion(amount: number, locale: string): string {
    const currencyConfig = {
        ar: { currency: "EGP", symbol: "ج.م" },
        "ar-EG": { currency: "EGP", symbol: "ج.م" },
        en: { currency: "EGP", symbol: "EGP" },
        "en-US": { currency: "EGP", symbol: "EGP" },
    };

    const config = currencyConfig[locale as keyof typeof currencyConfig] || currencyConfig["en"];

    const formatOptions: Intl.NumberFormatOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    };

    if (locale.startsWith("ar")) {
        formatOptions.numberingSystem = "arab";
    }

    const formattedNumber = new Intl.NumberFormat(locale, formatOptions).format(amount);

    if (locale.startsWith("ar")) {
        return `${formattedNumber} ${config.symbol}`;
    } else {
        return `${config.symbol} ${formattedNumber}`;
    }
}
