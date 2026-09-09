"use client"

import { useCallback, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { playChime } from "@/lib/chime"
import type { NotificationPriority, NotificationType } from "@/types"

export interface AdminNotification {
    id: string
    type: NotificationType
    title: string
    message: string
    actionUrl: string | null
    isRead: boolean
    priority: NotificationPriority
    createdAt: string
}

interface NotificationsResponse {
    notifications: AdminNotification[]
    unreadCount: number
}

const KEY = ["admin", "notifications"] as const

/**
 * The bell's data.
 *
 * Polling AND push, not one or the other. Push is the fast path and it is the one that works
 * with the tab closed, but it is also the one that is unavailable in a private window, blocked
 * by a corporate policy, or simply declined — and an administrator who declined a browser
 * prompt should still see the badge move. So this polls regardless, and push just makes the
 * poll arrive early.
 *
 * The interval is deliberately different in the two visibility states. A backgrounded tab
 * asking every fifteen seconds is a query per admin per fifteen seconds, all day, to learn
 * nothing; browsers also throttle its timers, so the promise of freshness is not one this code
 * could keep anyway.
 */
export function useNotifications(pollMs = 15_000) {
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: KEY,
        queryFn: async (): Promise<NotificationsResponse> => {
            const response = await fetch("/api/notifications?limit=30", { cache: "no-store" })
            if (!response.ok) throw new Error("failed to load notifications")
            return response.json()
        },
        /*
         * `typeof document === "undefined"` first, and not as a formality.
         *
         * A "use client" component still renders on the SERVER, and React Query evaluates a
         * functional `refetchInterval` during that render. Reaching for `document` there threw
         * `ReferenceError: document is not defined` and returned a 500 for the whole page —
         * every admin page, since the bell is in the shell. Found by rendering the component,
         * not by compiling it: `tsc` and the production build were both completely clean,
         * because `document` is a legitimate global in a file typed with the DOM lib.
         */
        refetchInterval: () =>
            typeof document === "undefined" || document.visibilityState === "visible" ? pollMs : pollMs * 8,
        refetchOnWindowFocus: true,
        staleTime: 5_000,
        // The bell is chrome, not content. A failure to load it should retry quietly and
        // never surface as a broken-looking header.
        retry: 2,
    })

    /*
     * The chime fires on a notification this browser has NOT seen before, which is not the
     * same as "the unread count went up". An administrator reading one notification on their
     * phone lowers the count here, and the next poll would otherwise raise it again and ring.
     * Tracking ids is the only version of this that does not ring at the wrong times.
     */
    const seen = useRef<Set<string> | null>(null)

    useEffect(() => {
        const notifications = query.data?.notifications
        if (!notifications) return

        if (seen.current === null) {
            // First load. Everything already on the server is history, not news.
            seen.current = new Set(notifications.map((n) => n.id))
            return
        }

        const fresh = notifications.filter((n) => !seen.current!.has(n.id) && !n.isRead)
        for (const n of notifications) seen.current.add(n.id)

        // One chime for a batch. Three orders arriving in the same poll is one event to a
        // person in a room, not three. (Inside an effect, so `document` exists here — effects
        // do not run during a server render.)
        if (fresh.length > 0 && document.visibilityState === "visible") playChime()
    }, [query.data])

    /*
     * A push wakes the service worker, not this page. The worker posts a message when it
     * handles one, and the response is to refetch rather than to trust the payload: the row is
     * the truth, the push is a nudge, and re-reading is what keeps the badge honest when two
     * notifications arrive together.
     */
    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === "notification") void queryClient.invalidateQueries({ queryKey: KEY })
        }
        navigator.serviceWorker.addEventListener("message", onMessage)
        return () => navigator.serviceWorker.removeEventListener("message", onMessage)
    }, [queryClient])

    const markRead = useMutation({
        mutationFn: async (input: { notificationIds?: string[]; markAllAsRead?: boolean }) => {
            const response = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            })
            if (!response.ok) throw new Error("failed to update notifications")
        },
        // Optimistic, because the badge is the thing being clicked. A count that waits for a
        // round trip before dropping reads as a click that did not register, and the second
        // click is how a list gets marked read twice.
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: KEY })
            const previous = queryClient.getQueryData<NotificationsResponse>(KEY)
            if (previous) {
                const ids = new Set(input.notificationIds ?? [])
                const next = previous.notifications.map((n) =>
                    input.markAllAsRead || ids.has(n.id) ? { ...n, isRead: true } : n
                )
                queryClient.setQueryData<NotificationsResponse>(KEY, {
                    notifications: next,
                    unreadCount: next.filter((n) => !n.isRead).length,
                })
            }
            return { previous }
        },
        onError: (_error, _input, context) => {
            if (context?.previous) queryClient.setQueryData(KEY, context.previous)
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })

    const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: KEY }), [queryClient])

    return {
        notifications: query.data?.notifications ?? [],
        unreadCount: query.data?.unreadCount ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        refresh,
        markRead: (ids: string[]) => markRead.mutate({ notificationIds: ids }),
        markAllRead: () => markRead.mutate({ markAllAsRead: true }),
    }
}
