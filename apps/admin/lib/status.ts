import type { LucideIcon } from "lucide-react"
import { AlertTriangle, OctagonAlert } from "lucide-react"
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@repo/database"
/*
 * The order and payment LABELS come from the domain layer (§19), through the client-safe
 * `@repo/database/status` subpath rather than the package root — the root instantiates a
 * PrismaClient at module scope, and this module is imported by client components.
 */
import { ORDER_STATUS_COPY, PAYMENT_STATUS_COPY } from "@repo/database/status"
import type {
    ActorType,
    ContactFormStatus,
    ContactPriority,
    EmailStatus,
    MovementType,
    OrderStatus,
    PaymentStatus,
    UserRole,
} from "@repo/database"

/**
 * THE status vocabulary (P4.5 §14).
 *
 * Before this there were two order-status maps — `STATUS_CLASS_MAP` in lib/utils.ts and a
 * second `LABEL_MAP` declared privately inside components/status-dropdown-menu.tsx — and
 * nine other status vocabularies in the schema with no mapping at all. Two maps for one
 * enum is how "Awaiting Shipment" becomes "Awaiting" on one screen, and how a colour gets
 * picked from `bg-blue-500` on one page and `bg-indigo-500` on the next.
 *
 * Rules this module exists to enforce:
 *   1. A page never chooses a status colour. It names a vocabulary and a value.
 *   2. Colour is never the only signal. Every entry carries a human label, and the label is
 *      always rendered — that, not an icon, is what satisfies the accessibility rule.
 *      Icons are opt-in and deliberately rare: an icon on every row of a 34px table is the
 *      per-row decoration §1.5 forbids.
 *   3. A variant is semantic, not decorative. There are five, they map to the five semantic
 *      token triplets in globals.css, and there is no sixth.
 *
 * Type-only imports for the Prisma enums: `@repo/database`'s entrypoint instantiates a
 * PrismaClient at module scope, so a value import here would drag it into any client
 * component that renders a badge.
 */

export type StatusVariant = "neutral" | "info" | "success" | "warning" | "danger"

export interface StatusEntry {
    /** What a person reads. Always rendered — this is the non-colour signal. */
    label: string
    variant: StatusVariant
    /** Opt-in, and rare. Only where the state is consequential enough to earn the pixels. */
    icon?: LucideIcon
    /** Feeds a tooltip. "Reserved" means nothing to someone on their first week. */
    description?: string
}

// ---------------------------------------------------------------------------
// Orders (§12) — the four states the state machine actually has. `processing`,
// `fulfilled` and `refunded` were removed from the schema; nothing here revives them.
//
// THE LABEL IS THE DOMAIN'S, THE VARIANT AND THE DESCRIPTION ARE THIS APP'S.
//
// That split is deliberate and is the whole point of §19. What a status is CALLED is a fact
// about the product — the storefront and the panel must not disagree about it, and they did:
// "Awaiting shipment" here, "Awaiting Shipment" in the storefront's order page, "Awaiting" in
// the old dropdown. It now comes from one place.
//
// The variant does NOT come from the domain's `tone`, and the difference is a real one rather
// than drift. To a customer, `awaiting_shipment` is reassuring and `cancelled` is bad news —
// the shared copy tones them warning and danger accordingly. To an operator, awaiting shipment
// is ordinary inbound work (info), shipped is the state that needs watching because a parcel
// is in somebody else's hands (warning), and cancelled is simply closed (neutral). Two
// audiences, two readings, one vocabulary.
// ---------------------------------------------------------------------------
const order: Record<OrderStatus, StatusEntry> = {
    awaiting_shipment: {
        label: ORDER_STATUS_COPY.awaiting_shipment.label.en,
        variant: "info",
        description: "Placed and paid for on delivery. Not yet handed to a courier.",
    },
    shipped: {
        label: ORDER_STATUS_COPY.shipped.label.en,
        variant: "warning",
        description: "With the courier. Payment is collected on delivery.",
    },
    delivered: {
        label: ORDER_STATUS_COPY.delivered.label.en,
        variant: "success",
        description: "Received by the customer. Stock and payment are settled.",
    },
    cancelled: {
        label: ORDER_STATUS_COPY.cancelled.label.en,
        variant: "neutral",
        description: "Terminal. Any reserved stock has been released.",
    },
}

// ---------------------------------------------------------------------------
// Payment. PAID means money received by the merchant, nothing weaker.
// ---------------------------------------------------------------------------
const payment: Record<PaymentStatus, StatusEntry> = {
    /*
     * "Pending", not the storefront's "Pay on delivery". Same status, same source of truth for
     * the fact, different register: the customer is being told what to do, the operator is
     * being told what has not happened yet.
     */
    PENDING: { label: "Pending", variant: "neutral", description: "Collected on delivery under COD." },
    PAID: { label: PAYMENT_STATUS_COPY.PAID.label.en, variant: "success", description: "Money received by the merchant." },
    REFUNDED: { label: PAYMENT_STATUS_COPY.REFUNDED.label.en, variant: "warning" },
    FAILED: { label: "Failed", variant: "danger", icon: OctagonAlert },
}

// ---------------------------------------------------------------------------
// Stock — derived, not an enum. See deriveStockState below for why these five
// are mutually exclusive rather than overlapping labels.
// ---------------------------------------------------------------------------
export type StockState = "in_stock" | "low" | "out" | "reserved" | "opening_count_pending"

const stock: Record<StockState, StatusEntry> = {
    in_stock: { label: "In stock", variant: "success" },
    low: {
        label: "Low",
        variant: "warning",
        description: `Fewer than ${DEFAULT_LOW_STOCK_THRESHOLD} available after reservations.`,
    },
    out: { label: "Out", variant: "danger", description: "Nothing on hand at this location." },
    reserved: {
        label: "Reserved",
        variant: "info",
        description: "On hand, but every unit is already committed to an open order.",
    },
    opening_count_pending: {
        label: "Opening count pending",
        variant: "neutral",
        description:
            "Levels came from the migration placeholder, not a physical count. Treat as unverified.",
    },
}

// ---------------------------------------------------------------------------
// Ledger movements. Direction is the information: what added stock, what removed it.
// ---------------------------------------------------------------------------
const movement: Record<MovementType, StatusEntry> = {
    INITIAL: { label: "Opening", variant: "neutral", description: "First recorded level for this product." },
    PURCHASE_RECEIPT: { label: "Receipt", variant: "success", description: "Stock in from a supplier." },
    SALE: { label: "Sale", variant: "info", description: "Stock out against an order." },
    RETURN: { label: "Return", variant: "warning", description: "Stock back in from a customer." },
    ADJUSTMENT: { label: "Adjustment", variant: "warning", description: "Manual correction. Always has a reason." },
    TRANSFER_IN: { label: "Transfer in", variant: "success" },
    TRANSFER_OUT: { label: "Transfer out", variant: "info" },
    DAMAGE: { label: "Damage", variant: "danger", description: "Written off. Cannot be sold." },
}

// ---------------------------------------------------------------------------
// Transactional mail. The outbox is where a failure becomes visible instead of silent.
// ---------------------------------------------------------------------------
const email: Record<EmailStatus, StatusEntry> = {
    PENDING: { label: "Queued", variant: "neutral", description: "Waiting for the next sweep." },
    SENDING: { label: "Sending", variant: "info" },
    SENT: { label: "Sent", variant: "success" },
    FAILED: {
        label: "Failed",
        variant: "danger",
        icon: OctagonAlert,
        description: "Every retry was exhausted. Nobody received this.",
    },
}

// ---------------------------------------------------------------------------
// Contact forms.
// ---------------------------------------------------------------------------
const contact: Record<ContactFormStatus, StatusEntry> = {
    UNREAD: { label: "Unread", variant: "info" },
    READ: { label: "Read", variant: "neutral" },
    IN_PROGRESS: { label: "In progress", variant: "warning" },
    RESPONDED: { label: "Responded", variant: "success" },
    CLOSED: { label: "Closed", variant: "neutral" },
    SPAM: { label: "Spam", variant: "danger" },
}

const priority: Record<ContactPriority, StatusEntry> = {
    LOW: { label: "Low", variant: "neutral" },
    NORMAL: { label: "Normal", variant: "neutral" },
    HIGH: { label: "High", variant: "warning" },
    URGENT: { label: "Urgent", variant: "danger", icon: AlertTriangle },
}

// ---------------------------------------------------------------------------
// Identity. CUSTOMER appears here because /admin/customers lists people whose
// role is exactly that, and the distinction from an administrator has to be visible.
// ---------------------------------------------------------------------------
const role: Record<UserRole, StatusEntry> = {
    CUSTOMER: { label: "Customer", variant: "neutral" },
    ADMIN: { label: "Admin", variant: "info" },
    SUPER_ADMIN: {
        label: "Super admin",
        variant: "warning",
        description: "May create, promote and demote other administrators.",
    },
}

/** Who performed an audited action. Rendered in the audit log and the record rail. */
const actor: Record<ActorType, StatusEntry> = {
    CUSTOMER: { label: "Customer", variant: "neutral" },
    ADMIN: { label: "Admin", variant: "info" },
    SYSTEM: { label: "System", variant: "neutral", description: "A scheduled job or a migration." },
    WEBHOOK: { label: "Webhook", variant: "neutral", description: "An inbound callback, such as a courier." },
}

// ---------------------------------------------------------------------------
// Translation completeness (§16). Arabic never falls back to English, so "English only"
// is a real, reportable state rather than a cosmetic gap.
// ---------------------------------------------------------------------------
export type TranslationState = "complete" | "en_only" | "ar_only" | "missing"

const translation: Record<TranslationState, StatusEntry> = {
    complete: { label: "Complete", variant: "success" },
    en_only: {
        label: "EN only",
        variant: "warning",
        description: "No Arabic. This renders as a gap on the Arabic storefront.",
    },
    ar_only: { label: "AR only", variant: "warning", description: "No English." },
    missing: { label: "Untranslated", variant: "danger", description: "Neither language has a name." },
}

// ---------------------------------------------------------------------------
// Data-quality severity. Ordered: each level is strictly worse than the one above it.
// ---------------------------------------------------------------------------
export type QualitySeverity = "ok" | "info" | "warning" | "critical"

const quality: Record<QualitySeverity, StatusEntry> = {
    ok: { label: "OK", variant: "success" },
    info: { label: "Minor", variant: "neutral", description: "Worth fixing, harms nothing today." },
    warning: { label: "Needs attention", variant: "warning", icon: AlertTriangle },
    critical: {
        label: "Blocking",
        variant: "danger",
        icon: OctagonAlert,
        description: "The product cannot be published in this state.",
    },
}

// ---------------------------------------------------------------------------
// Discounts (§13.2, migration 0015). Four states, and the distinction that matters is
// ended-vs-stopped: one ran to its date, the other was pulled. Both leave prices back at
// base, and only one of them is something somebody decided.
// ---------------------------------------------------------------------------
export type DiscountState = "scheduled" | "live" | "ended" | "stopped"

const discount: Record<DiscountState, StatusEntry> = {
    scheduled: {
        label: "Scheduled",
        variant: "info",
        description: "Created, not started. Customers still pay the base price.",
    },
    live: { label: "Live", variant: "success", description: "Customers are paying the discounted price now." },
    ended: { label: "Ended", variant: "neutral", description: "Ran to its end date." },
    stopped: { label: "Stopped", variant: "warning", description: "Ended early by an administrator." },
}

// ---------------------------------------------------------------------------
// The registry.
// ---------------------------------------------------------------------------
export const STATUS = {
    order,
    payment,
    stock,
    movement,
    email,
    contact,
    priority,
    role,
    actor,
    translation,
    quality,
    discount,
} as const

export type StatusKind = keyof typeof STATUS
export type StatusValue<K extends StatusKind> = keyof (typeof STATUS)[K]

/**
 * Look up an entry.
 *
 * Falls back to a neutral badge showing the raw value rather than throwing or rendering
 * nothing: a value the registry has not caught up with is a gap to notice on screen, not a
 * crashed page. It is deliberately ugly so it gets fixed.
 */
export function statusEntry<K extends StatusKind>(kind: K, value: StatusValue<K> | string): StatusEntry {
    const table = STATUS[kind] as Record<string, StatusEntry | undefined>
    return table[String(value)] ?? { label: String(value), variant: "neutral" }
}

/** The label alone — for CSV exports, `<title>`s and anywhere a badge would be wrong. */
export function statusLabel<K extends StatusKind>(kind: K, value: StatusValue<K> | string): string {
    return statusEntry(kind, value).label
}

/**
 * Derive a product's stock state.
 *
 * The definition of "low" is the ledger's, not this module's: `onHand - reserved` against
 * `DEFAULT_LOW_STOCK_THRESHOLD`, imported from @repo/database/inventory, which is what
 * `countLowStock` and `listLowStock` already query. A product with 12 on hand and 11
 * reserved is low, and any UI that compared `onHand` alone would disagree with the
 * dashboard's own count.
 *
 * The five states are ordered and mutually exclusive, which is why "Reserved" is a state
 * rather than an annotation: it means stock is physically present but entirely committed —
 * genuinely different from "Out", where there is nothing on the shelf, and the two call for
 * different actions.
 */
export function deriveStockState(input: {
    onHand: number
    reserved: number
    /** The installation-wide flag from `isOpeningCountPending()`. Not per-product. */
    openingCountPending?: boolean
    threshold?: number
}): StockState {
    const { onHand, reserved, openingCountPending = false } = input
    const threshold = input.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD

    if (openingCountPending) return "opening_count_pending"

    const available = onHand - reserved
    if (onHand <= 0) return "out"
    if (available <= 0) return "reserved"
    if (available < threshold) return "low"
    return "in_stock"
}
