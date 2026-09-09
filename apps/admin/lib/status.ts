import type { LucideIcon } from "lucide-react"
import { AlertTriangle, OctagonAlert } from "lucide-react"
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@repo/database"
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

export type StatusVariant = "neutral" | "info" | "success" | "warning" | "danger"

export interface StatusEntry {
    label: string
    variant: StatusVariant
    icon?: LucideIcon
    description?: string
}

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

const payment: Record<PaymentStatus, StatusEntry> = {
    PENDING: { label: "Pending", variant: "neutral", description: "Collected on delivery under COD." },
    PAID: { label: PAYMENT_STATUS_COPY.PAID.label.en, variant: "success", description: "Money received by the merchant." },
    REFUNDED: { label: PAYMENT_STATUS_COPY.REFUNDED.label.en, variant: "warning" },
    FAILED: { label: "Failed", variant: "danger", icon: OctagonAlert },
}

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

const role: Record<UserRole, StatusEntry> = {
    CUSTOMER: { label: "Customer", variant: "neutral" },
    ADMIN: { label: "Admin", variant: "info" },
    SUPER_ADMIN: {
        label: "Super admin",
        variant: "warning",
        description: "May create, promote and demote other administrators.",
    },
}

const actor: Record<ActorType, StatusEntry> = {
    CUSTOMER: { label: "Customer", variant: "neutral" },
    ADMIN: { label: "Admin", variant: "info" },
    SYSTEM: { label: "System", variant: "neutral", description: "A scheduled job or a migration." },
    WEBHOOK: { label: "Webhook", variant: "neutral", description: "An inbound callback, such as a courier." },
}

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

export function statusEntry<K extends StatusKind>(kind: K, value: StatusValue<K> | string): StatusEntry {
    const table = STATUS[kind] as Record<string, StatusEntry | undefined>
    return table[String(value)] ?? { label: String(value), variant: "neutral" }
}

export function statusLabel<K extends StatusKind>(kind: K, value: StatusValue<K> | string): string {
    return statusEntry(kind, value).label
}

export function deriveStockState(input: {
    onHand: number
    reserved: number
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
