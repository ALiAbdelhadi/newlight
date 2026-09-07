import type { LucideIcon } from "lucide-react"
import {
    Boxes,
    FolderTree,
    Gauge,
    Languages,
    Mail,
    Package,
    Palette,
    Ruler,
    ScrollText,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Truck,
    Users,
} from "lucide-react"

import type { DashboardStats } from "@/types"

/**
 * THE navigation (P4.5 §7, §28).
 *
 * This replaces two things. `constant/index.tsx` was dead code — nothing imported it — and
 * pointed at `/admin/customers`, a route that does not exist. The navigation people actually
 * saw was a thirteen-item flat array hardcoded inside components/sidebar.tsx, mixing
 * "Products" with "Audit log" at the same level, so an operator scanned thirteen unrelated
 * words to find one screen.
 *
 * Two rules hold this file together:
 *
 *   EVERY href IS A ROUTE THAT EXISTS TODAY. Not one is aspirational. The IA has thirty
 *   surfaces planned; fourteen are built, and only those fourteen appear here. A navigation
 *   item leading to a 404 teaches people to distrust the whole menu, and there is no
 *   backward-compatibility argument for keeping a link that was already broken.
 *
 *   DOMAINS ARE THE OPERATOR'S MENTAL MODEL, not the schema's. "Reference data" holds
 *   colours, families and specifications because a person setting up the catalogue thinks of
 *   them together, even though they are three unrelated tables.
 *
 * Adding a surface: add the route, then add it here. Both, in that order.
 */

export interface NavSurface {
    label: string
    href: string
    icon: LucideIcon
    /** Pulls a counter off the shell's stats. Absent means the row shows no badge. */
    badge?: (stats: DashboardStats) => number | undefined
    /** Badges that mean "something needs attention" rather than "here is the size of this". */
    badgeTone?: "neutral" | "attention"
    /**
     * Routes that should light this row up but are not it — a record page under a list.
     * Without this, opening a product leaves the whole sidebar looking unselected.
     */
    match?: string[]
    /**
     * Sibling routes that live UNDER this href but belong to another surface.
     *
     * `/admin/products/pricing` sits inside Products' path and belongs to Pricing. Marking
     * Products `exact` was the first attempt and was wrong in the other direction: it stopped
     * `/admin/products/<id>` matching too, so opening a product cleared the sidebar selection
     * and collapsed the breadcrumb to "Admin".
     */
    except?: string[]
}

export interface NavDomain {
    id: string
    label: string
    surfaces: NavSurface[]
}

/** Not in a domain. One screen, sitting above the grouping, the way a home does. */
export const OVERVIEW: NavSurface = {
    label: "Overview",
    href: "/admin/dashboard",
    icon: Gauge,
}

export const NAVIGATION: NavDomain[] = [
    {
        id: "catalog",
        label: "Catalog",
        surfaces: [
            {
                label: "Products",
                href: "/admin/products",
                icon: Package,
                badge: (s) => s.products,
                badgeTone: "neutral",
                // Record and create routes belong to Products; repricing does not.
                except: ["/admin/products/pricing"],
            },
            { label: "Categories", href: "/admin/taxonomy", icon: FolderTree },
            { label: "Specifications", href: "/admin/specs", icon: Ruler },
            { label: "Reference data", href: "/admin/reference", icon: Palette },
            {
                label: "Translations",
                href: "/admin/translations",
                icon: Languages,
                badge: (s) => (s.untranslated > 0 ? s.untranslated : undefined),
                badgeTone: "attention",
            },
        ],
    },
    {
        id: "pricing",
        label: "Pricing",
        surfaces: [{ label: "Bulk repricing", href: "/admin/products/pricing", icon: Tags }],
    },
    {
        id: "inventory",
        label: "Inventory",
        surfaces: [
            {
                label: "Stock levels",
                href: "/admin/inventory",
                icon: Boxes,
                // `reviews` is the low-stock count. The field name is v1's; the meaning is not.
                badge: (s) => (s.reviews > 0 ? s.reviews : undefined),
                badgeTone: "attention",
            },
        ],
    },
    {
        id: "sales",
        label: "Sales",
        surfaces: [
            {
                label: "Orders",
                href: "/admin/orders",
                icon: ShoppingCart,
                badge: (s) => (s.orders > 0 ? s.orders : undefined),
                badgeTone: "attention",
            },
            {
                label: "Shipping",
                href: "/admin/shipping",
                icon: Truck,
                badge: (s) => (s.shipping > 0 ? s.shipping : undefined),
                badgeTone: "attention",
            },
            {
                label: "Customers",
                href: "/admin/users",
                icon: Users,
                badge: (s) => s.customers,
                badgeTone: "neutral",
            },
        ],
    },
    {
        id: "communication",
        label: "Communication",
        surfaces: [
            {
                label: "Contact forms",
                href: "/admin/contact",
                icon: Mail,
                badge: (s) => (s.contacts > 0 ? s.contacts : undefined),
                badgeTone: "attention",
            },
        ],
    },
    {
        id: "system",
        label: "System",
        surfaces: [
            { label: "Administrators", href: "/admin/team", icon: ShieldCheck },
            { label: "Audit log", href: "/admin/audit", icon: ScrollText },
        ],
    },
]

/** Flat, for the command palette and the breadcrumb resolver. */
export const ALL_SURFACES: NavSurface[] = [OVERVIEW, ...NAVIGATION.flatMap((d) => d.surfaces)]

export function isSurfaceActive(surface: NavSurface, pathname: string): boolean {
    if (surface.except?.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return false
    if (pathname === surface.href) return true
    if (surface.match?.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return true
    return pathname.startsWith(`${surface.href}/`)
}

export function activeDomainId(pathname: string): string | undefined {
    return NAVIGATION.find((d) => d.surfaces.some((s) => isSurfaceActive(s, pathname)))?.id
}

export function activeSurface(pathname: string): NavSurface | undefined {
    // Longest href first, so /admin/products/pricing beats /admin/products.
    return [...ALL_SURFACES]
        .sort((a, b) => b.href.length - a.href.length)
        .find((s) => isSurfaceActive(s, pathname))
}

/**
 * Breadcrumbs (§7.1).
 *
 * Domain → surface → record. The domain is not a link because it has no page of its own —
 * rendering it as one would promise a screen that does not exist.
 */
export interface Crumb {
    label: string
    href?: string
}

const RECORD_SEGMENT_LABEL: Record<string, string> = {
    new: "New",
    pricing: "Bulk repricing",
    category: "Category",
    "sub-category": "Sub-category",
}

export function breadcrumbsFor(pathname: string, recordLabel?: string): Crumb[] {
    const surface = activeSurface(pathname)
    if (!surface) return [{ label: "Admin" }]

    const domain = NAVIGATION.find((d) => d.surfaces.includes(surface))
    const crumbs: Crumb[] = []
    if (domain) crumbs.push({ label: domain.label })
    crumbs.push({ label: surface.label, href: surface.href })

    // Whatever is left after the surface's own href is the record trail.
    const rest = pathname
        .slice(surface.href.length)
        .split("/")
        .filter(Boolean)
        .filter((segment) => segment !== "pricing")

    for (const [index, segment] of rest.entries()) {
        const last = index === rest.length - 1
        const known = RECORD_SEGMENT_LABEL[segment]
        if (known) {
            crumbs.push({ label: known })
            continue
        }
        if (last && recordLabel) {
            crumbs.push({ label: recordLabel })
            continue
        }
        /*
         * A raw cuid as the final crumb reads as line noise — "cmnqkupp300zt8tkkxiotmgbk"
         * tells a person nothing about where they are. Until a caller passes the entity's
         * real name, say what KIND of thing it is instead of showing its id.
         */
        crumbs.push({ label: /^c[a-z0-9]{20,}$/.test(segment) ? "Record" : segment })
    }

    return crumbs
}

