import { formatMoney, type MoneyInput } from "@repo/database"

export const formatPrice = (price: MoneyInput) => formatMoney(price, "en", "EGP", { digits: "fixed" })

export const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
