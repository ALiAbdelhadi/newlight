export type SortDirection = "asc" | "desc"
export type Density = "compact" | "comfortable" | "dense"

export const DENSITIES: Density[] = ["compact", "comfortable", "dense"]
export const PAGE_SIZES = [25, 50, 100, 200] as const
export const DEFAULT_PAGE_SIZE = 50

export interface TableState {
    page: number
    pageSize: number
    sort: string | null
    dir: SortDirection
    density: Density
    filters: Record<string, string>
}

const RESERVED = new Set(["page", "size", "sort", "dir", "density", "cols", "view"])

export function parseTableState(
    searchParams: Record<string, string | string[] | undefined>,
    defaults: { sort?: string; dir?: SortDirection; pageSize?: number } = {}
): TableState {
    const one = (key: string): string | undefined => {
        const value = searchParams[key]
        return Array.isArray(value) ? value[0] : value
    }

    const rawPage = Number(one("page") ?? 1)
    const rawSize = Number(one("size") ?? defaults.pageSize ?? DEFAULT_PAGE_SIZE)

    const filters: Record<string, string> = {}
    for (const [key, value] of Object.entries(searchParams)) {
        if (RESERVED.has(key)) continue
        const single = Array.isArray(value) ? value[0] : value
        if (single) filters[key] = single
    }

    return {
        page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
        pageSize: (PAGE_SIZES as readonly number[]).includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE,
        sort: one("sort") ?? defaults.sort ?? null,
        dir: one("dir") === "asc" ? "asc" : one("dir") === "desc" ? "desc" : (defaults.dir ?? "desc"),
        density: DENSITIES.includes(one("density") as Density) ? (one("density") as Density) : "compact",
        filters,
    }
}

export function buildTableQuery(
    current: URLSearchParams,
    patch: Record<string, string | number | null | undefined>
): string {
    const next = new URLSearchParams(current.toString())

    for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key)
        else next.set(key, String(value))
    }

    const resetsPage = Object.keys(patch).some((key) => key !== "page")
    if (resetsPage && !("page" in patch)) next.delete("page")

    if (next.get("page") === "1") next.delete("page")
    if (next.get("density") === "compact") next.delete("density")
    if (next.get("size") === String(DEFAULT_PAGE_SIZE)) next.delete("size")

    const query = next.toString()
    return query ? `?${query}` : ""
}

export function nextSort(
    state: Pick<TableState, "sort" | "dir">,
    column: string
): { sort: string | null; dir: SortDirection | null } {
    if (state.sort !== column) return { sort: column, dir: "desc" }
    if (state.dir === "desc") return { sort: column, dir: "asc" }
    return { sort: null, dir: null }
}

export function ariaSortFor(
    state: Pick<TableState, "sort" | "dir">,
    column: string
): "ascending" | "descending" | "none" {
    if (state.sort !== column) return "none"
    return state.dir === "asc" ? "ascending" : "descending"
}

export interface PageWindow {
    from: number
    to: number
    total: number
    totalPages: number
    hasPrevious: boolean
    hasNext: boolean
}

export function pageWindow(state: TableState, total: number): PageWindow {
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize))
    const page = Math.min(state.page, totalPages)
    const from = total === 0 ? 0 : (page - 1) * state.pageSize + 1
    return {
        from,
        to: Math.min(page * state.pageSize, total),
        total,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages,
    }
}

export function toPrismaPage(state: TableState, total: number): { skip: number; take: number } {
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize))
    const page = Math.min(state.page, totalPages)
    return { skip: (page - 1) * state.pageSize, take: state.pageSize }
}
