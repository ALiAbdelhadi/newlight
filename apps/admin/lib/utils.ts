import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/*
 * `getStatusBadgeClassName`, `STATUS_CLASS_MAP` and `LABEL_MAP` used to live here.
 *
 * They covered one enum out of eleven, hardcoded four Tailwind palette colours that no
 * token could reach, and had a second, divergent copy of the label map inside
 * components/status-dropdown-menu.tsx — so the same order read "Awaiting Shipment" on the
 * dashboard and "Awaiting" in the status menu.
 *
 * The whole vocabulary now lives in lib/status.ts, and is rendered by
 * components/status-badge.tsx. Import `statusLabel` when you need the text alone.
 */
