"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import {
    AlertTriangle,
    Bell,
    BellOff,
    CheckCheck,
    Mail,
    PackageMinus,
    ShoppingCart,
    Volume2,
    VolumeX,
    XCircle,
} from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications, type AdminNotification } from "@/hooks/use-notifications"
import { playChime, setSoundEnabled, soundEnabled } from "@/lib/chime"
import { currentPushStatus, disablePush, enablePush, type PushState } from "@/lib/push-client"
import { cn } from "@/lib/utils"
import type { NotificationType } from "@/types"

/**
 * The notification bell (§17), in the top bar's trailing slot beside the account menu.
 *
 * It reads the same rows the §17 sweep pushes, which is the point: push and this list cannot
 * disagree, because the push is a nudge toward a row and this is the row. An administrator who
 * declined the browser prompt loses the nudge and keeps everything else.
 *
 * Two switches at the foot, and both are honest about what they control. "Browser
 * notifications" is the OS-level channel and works with the panel closed; "Sound" is the chime
 * this tab plays and only applies while it is open. Collapsing them into one toggle would mean
 * a person who wanted a quiet tab silently loses the alert that reaches them at lunch.
 */

const ICONS: Record<NotificationType, typeof Bell> = {
    NEW_ORDER: ShoppingCart,
    ORDER_CANCELLED: XCircle,
    NEW_CONTACT_FORM: Mail,
    LOW_INVENTORY: PackageMinus,
    SYSTEM_ALERT: AlertTriangle,
    CUSTOM: Bell,
}

/**
 * The accent is chosen by TYPE, never by priority.
 *
 * Priority is how LOUD a notification is — it decides whether the OS banner stays on screen
 * until acknowledged. It is not what a notification MEANS. Tinting by it put a new order, the
 * most valuable event this system produces, in the same destructive red as a cancellation,
 * because both are HIGH. Red is the colour of something going wrong in this panel, and the
 * badge on the bell already uses it for exactly that.
 */
const ACCENT: Record<NotificationType, string> = {
    // An order is money in, so it reads as success rather than as an emergency.
    NEW_ORDER: "border-success-border bg-success-bg text-success",
    ORDER_CANCELLED: "border-danger-border bg-danger-bg text-danger",
    // Attention, not failure. Nothing is broken; something needs doing.
    LOW_INVENTORY: "border-warning-border bg-warning-bg text-warning",
    SYSTEM_ALERT: "border-warning-border bg-warning-bg text-warning",
    NEW_CONTACT_FORM: "border-info-border bg-info-bg text-info",
    CUSTOM: "border-neutral-border bg-neutral-bg text-neutral",
}

export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications()

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    /*
                     * The count is IN the accessible name, not only in a coloured dot. A badge
                     * a screen reader cannot read is decoration, and "Notifications" alone
                     * gives no reason to open the menu.
                     */
                    aria-label={
                        unreadCount > 0
                            ? `Notifications, ${unreadCount} unread`
                            : "Notifications, none unread"
                    }
                    className={cn(
                        "relative grid size-7 shrink-0 place-items-center rounded-md border border-border-strong bg-background",
                        "text-muted-foreground transition-colors duration-(--duration-fast)",
                        "hover:bg-accent hover:text-foreground"
                    )}
                >
                    <Bell aria-hidden className="size-3.5" />
                    {unreadCount > 0 && (
                        <span
                            aria-hidden
                            className={cn(
                                "absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full px-1",
                                "bg-destructive text-2xs/4 font-semibold text-destructive-foreground tabular-nums"
                            )}
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={6} className="w-[22rem] p-0">
                <header className="flex items-center justify-between border-b px-3 py-2">
                    <h2 className="text-xs font-semibold">Notifications</h2>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => markAllRead()}
                            className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground"
                        >
                            <CheckCheck aria-hidden className="size-3" />
                            Mark all read
                        </button>
                    )}
                </header>

                {/*
                  * A plain overflow container, not the ScrollArea component. Radix's viewport
                  * is `height: 100%` of a Root that has only a max-height here, so the height
                  * resolves to auto and the scrollbar never engages — the list would be
                  * clipped with no way to reach the rest of it.
                  */}
                <div className="max-h-80 overflow-y-auto overscroll-contain">
                    {isLoading ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>
                    ) : notifications.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                            Nothing yet. New orders, cancellations, enquiries and low stock land here.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationRow
                                    key={notification.id}
                                    notification={notification}
                                    onOpen={() => {
                                        if (!notification.isRead) markRead([notification.id])
                                        setOpen(false)
                                    }}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <ChannelControls />
            </PopoverContent>
        </Popover>
    )
}

function NotificationRow({ notification, onOpen }: { notification: AdminNotification; onOpen: () => void }) {
    const Icon = ICONS[notification.type] ?? Bell

    const body = (
        <>
            <span
                aria-hidden
                className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border",
                    ACCENT[notification.type] ?? "border-neutral-border bg-neutral-bg text-neutral"
                )}
            >
                <Icon className="size-3" />
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                    <span className={cn("truncate text-xs", notification.isRead ? "font-normal" : "font-semibold")}>
                        {notification.title}
                    </span>
                    <span className="ml-auto shrink-0 text-2xs text-muted-foreground tabular-nums">
                        {relativeTime(notification.createdAt)}
                    </span>
                </span>
                <span className="mt-0.5 block text-2xs leading-4 text-muted-foreground">{notification.message}</span>
            </span>

            {/* Unread is carried by weight AND by this marker. Weight alone is invisible to
                anyone reading one row rather than comparing two. */}
            {!notification.isRead && (
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            )}
        </>
    )

    const className = cn(
        "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-(--duration-fast)",
        "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        !notification.isRead && "bg-primary/[0.03]"
    )

    return (
        <li>
            {notification.actionUrl ? (
                <Link href={notification.actionUrl} onClick={onOpen} className={className}>
                    {body}
                </Link>
            ) : (
                <button type="button" onClick={onOpen} className={className}>
                    {body}
                </button>
            )}
        </li>
    )
}

function ChannelControls() {
    const [push, setPush] = useState<{ state: PushState; reason?: string }>({ state: "off" })
    const [busy, setBusy] = useState(false)
    const [sound, setSound] = useState(false)

    // Read on mount rather than during render: both answers live in the browser, and reading
    // them while rendering is a hydration mismatch waiting for its first server pass.
    useEffect(() => {
        setSound(soundEnabled())
        void currentPushStatus().then(setPush)
    }, [])

    const unavailable = push.state === "unsupported" || push.state === "unconfigured" || push.state === "denied"

    return (
        <footer className="space-y-1 border-t px-3 py-2">
            <button
                type="button"
                disabled={busy || unavailable}
                onClick={async () => {
                    setBusy(true)
                    try {
                        setPush(push.state === "on" ? await disablePush() : await enablePush())
                    } finally {
                        setBusy(false)
                    }
                }}
                /*
                 * An unavailable channel is NOT greyed out. The reason it is unavailable is
                 * written underneath it in words, which tells a person more than a dimmed
                 * label does — and dimming the label while leaving the explanation at full
                 * strength made the subtitle read louder than the thing it describes.
                 */
                className={cn(
                    "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-2xs transition-colors duration-(--duration-fast)",
                    unavailable ? "cursor-not-allowed" : "hover:bg-accent"
                )}
            >
                {push.state === "on" ? (
                    <Bell aria-hidden className="size-3 text-primary" />
                ) : (
                    <BellOff aria-hidden className="size-3 text-muted-foreground" />
                )}
                <span className="flex-1 text-left">
                    Browser notifications
                    <span className="block text-muted-foreground">
                        {push.reason ?? (push.state === "on" ? "On — alerts arrive with the panel closed" : "Off — click to enable")}
                    </span>
                </span>
            </button>

            <button
                type="button"
                onClick={() => {
                    const next = !sound
                    setSoundEnabled(next)
                    setSound(next)
                    // Play it when switching ON, so "sound" is a thing that was demonstrated
                    // rather than a claim. This is also the user gesture that unlocks the
                    // AudioContext, so the first real notification is audible.
                    if (next) playChime()
                }}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-2xs transition-colors duration-(--duration-fast) hover:bg-accent"
            >
                {sound ? (
                    <Volume2 aria-hidden className="size-3 text-primary" />
                ) : (
                    <VolumeX aria-hidden className="size-3 text-muted-foreground" />
                )}
                <span className="flex-1 text-left">
                    Sound
                    <span className="block text-muted-foreground">
                        {sound ? "On — chimes while this tab is open" : "Off"}
                    </span>
                </span>
            </button>
        </footer>
    )
}

function relativeTime(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    // "3m", "2h", "4d" — the bar is 44px tall and "about 3 minutes ago" does not fit beside a
    // title that matters more than it does.
    return formatDistanceToNowStrict(date)
        .replace(/ seconds?/, "s")
        .replace(/ minutes?/, "m")
        .replace(/ hours?/, "h")
        .replace(/ days?/, "d")
        .replace(/ months?/, "mo")
        .replace(/ years?/, "y")
}
