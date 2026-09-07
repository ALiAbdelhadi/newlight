/**
 * Structural shapes shared by the service layer.
 *
 * These describe only the fields a helper actually reads, so a Prisma result,
 * a mapped projection, or a hand-written `@/types` value all satisfy them
 * without a cast.
 */

/** Anything carrying per-locale translation rows with a specifications blob. */
export type SpecificationSource = {
    translations?: Array<{ locale: string; specifications?: unknown }> | null
}

/** Anything sortable by the catalog's display ordering rules. */
export type SortableEntity = {
    order?: number
    isFeatured?: boolean
    translations?: Array<{ locale: string; name: string }>
}
