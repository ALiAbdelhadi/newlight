export type SpecificationSource = {
    translations?: Array<{ locale: string; specifications?: unknown }> | null
}

export type SortableEntity = {
    order?: number
    isFeatured?: boolean
    translations?: Array<{ locale: string; name: string }>
}
