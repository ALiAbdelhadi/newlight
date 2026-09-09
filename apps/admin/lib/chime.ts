"use client"

/**
 * The sound a new notification makes while the panel is open.
 *
 * Synthesised rather than shipped as a file. Two reasons, and the first is not weight: an
 * audio asset has to be fetched, and the fetch happens at the exact moment something urgent
 * arrived — on a bad connection the chime lands after the person has already looked. A
 * WebAudio oscillator is instant and always available.
 *
 * A perfect fifth, two short notes, under a fifth of a second. Loud enough to notice across a
 * room, short enough that hearing it forty times in a day is not a reason to mute the tab —
 * which is what happens to a chime that is even slightly too pleased with itself.
 */

const STORAGE_KEY = "newlight.admin.notification-sound"

/** Default ON. The channel exists so that someone finds out without looking at the screen. */
export function soundEnabled(): boolean {
    if (typeof window === "undefined") return false
    try {
        return window.localStorage.getItem(STORAGE_KEY) !== "off"
    } catch {
        // Private-window storage throws on access. A muted bell is the safer failure.
        return false
    }
}

export function setSoundEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
    } catch {
        // Nothing to do. The preference simply does not survive the tab.
    }
}

let context: AudioContext | null = null

/**
 * Plays nothing, silently, when the browser has not yet had a user gesture — every browser
 * suspends an AudioContext created before one. That is not a bug to work around: a page that
 * makes noise before anybody has interacted with it is the reason the rule exists. Once the
 * administrator has clicked anything at all, this works.
 */
export function playChime(): void {
    if (typeof window === "undefined" || !soundEnabled()) return

    try {
        const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        context ??= new Ctor()
        if (context.state === "suspended") void context.resume()

        const now = context.currentTime
        // A5 then E6 — a fifth up, which reads as "something arrived" rather than as an alarm.
        note(context, 880, now, 0.09)
        note(context, 1318.5, now + 0.09, 0.13)
    } catch {
        // Audio is a courtesy. It never gets to be the reason a render fails.
    }
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number): void {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = frequency

    // A hard start or stop on a sine wave is an audible click. Ramping both ends is the whole
    // difference between a chime and a pop.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
}
