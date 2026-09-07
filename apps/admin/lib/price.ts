/**
 * Re-export only (§4). The admin's own formatter was `Intl.NumberFormat("en-US", …)` with the
 * locale hardcoded, so an amount rendered differently here than on the storefront. There is
 * one implementation now, in @repo/database/money.
 */
import { formatMoney, type MoneyInput } from "@repo/database"

/**
 * The admin app is English-only by design, so the locale is fixed rather than threaded.
 *
 * `digits: "fixed"` is the admin's rule and the storefront's is not. A shelf price reads
 * "EGP 165"; a price COLUMN reading "EGP 165" above "EGP 1,234.56" has its decimal points in
 * two places, and tabular figures then align nothing. Every one of this function's call
 * sites is a table cell or a record field, so the choice belongs here rather than repeated
 * at each of them.
 *
 * New code should prefer `<Money>` from components/money.tsx: it takes a SerializedMoney
 * string, so a raw Prisma Decimal cannot reach a client component through it.
 */
export const formatPrice = (price: MoneyInput) => formatMoney(price, "en", "EGP", { digits: "fixed" })

export const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
