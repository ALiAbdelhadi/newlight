import { PLACEHOLDER, type Locale, type ProductColorTemp } from "@repo/database"

import type { CardView, ProductListCard } from "./selectors"

/**
 * The facets a product listing can honestly offer.
 *
 * WHAT DECIDED THIS LIST. Every dimension here is a column or a relation the database already
 * carries, and each one was checked against the schema before it earned a control:
 *
 *   colour temperature  `Product.colorTemperatures` — a `ProductColorTemp[]` scalar enum array
 *   finish              `ProductAvailableColor` → `ProductColor`, maintained in the admin's
 *                       Reference data screen
 *   availability        `StockLevel.onHand - reserved` at the main location
 *   on sale             `resolveEffectivePrice` against the live `Discount` set (0015)
 *
 * WHAT WAS LEFT OUT, and why, because the absences are decisions too:
 *
 *   NAME SORT. Prisma cannot `orderBy` a related translation's column, which is the same wall
 *   the admin's product list hit — it substitutes the SKU and says so. Offering "sort by name"
 *   that silently sorted by SKU would be a control that lies, so there isn't one.
 *
 *   SPEC FACETS are built, and WHICH specs get a control is decided from the data rather than
 *   from a list somebody typed. `SubCategorySpec` says which specs a sub-category asks for —
 *   Magnetic Track declares eleven — and then two rules cut that to the ones worth showing:
 *
 *     A spec whose products all share ONE value narrows nothing. Six of those eleven are like
 *     that: every product is `AC 175-265V`, `>80` CRI, `IP20`, 50,000 hours. A chip that
 *     matches all 25 families is a control with no outcome.
 *
 *     A spec with a value for nearly every product is an identifier, not a facet.
 *     `product_dimensions` has 35 distinct values across 77 products; nobody filters a
 *     catalogue by "L331×W22×H25 mm".
 *
 *   What survives on that listing is Maximum Wattage (14 values), Main Material (4) and Beam
 *   Angle (2) — which are the three a person choosing a track light actually cares about.
 *
 *   The near-duplicate values in Main Material ("Aluminum", "Die-cast Aluminum", "Die-Casting
 *   Aluminum") are NOT merged. They are what the catalogue holds, the admin's data-quality
 *   queue already reports them, and silently folding three values into one here would hide a
 *   data problem behind a filter and make the counts disagree with the product pages.
 *
 *   FAMILY. The listing already shows one card per family, so filtering by family would filter
 *   to one card.
 *
 *   BRAND. There is no brand column. NewLight is the brand.
 *
 * WHY THE COUNTS ARE COMPUTED HERE rather than in SQL: the listing loads the whole
 * sub-category — there is no pagination, and the largest sub-category in the catalogue is well
 * under a hundred rows — so the set in hand IS the population. Counting it is exact. The rule
 * this must never break is the admin's: never filter one page and report the count as an answer
 * about the collection. Here the page is the collection.
 */

export type SortKey = "featured" | "price-asc" | "price-desc" | "newest"

export const SORT_KEYS: readonly SortKey[] = ["featured", "price-asc", "price-desc", "newest"]

export function isSortKey(value: unknown): value is SortKey {
    return typeof value === "string" && (SORT_KEYS as readonly string[]).includes(value)
}

/** One selectable value, with how many products carry it. A facet with 0 is never rendered. */
export interface FacetOption {
    value: string
    label: string
    count: number
    /** For finishes: the swatch. */
    hex?: string
}

export interface ProductFacets {
    colorTemperatures: FacetOption[]
    colors: FacetOption[]
    /** Only the specs that survived the two rules above. Empty is a normal answer. */
    specs: SpecFacet[]
    /** How many are available now — `onHand - reserved > 0`. */
    inStock: number
    /** How many carry a live discount. */
    onSale: number
    total: number
}

/**
 * A listing tile, flattened for the client.
 *
 * The filter runs in the browser over the complete set (see above), so every attribute it
 * filters on has to cross the boundary — and it crosses as plain data, not as Prisma rows.
 * `available` is resolved here, on the server, because `onHand - reserved` is arithmetic the
 * client has no business repeating.
 */
export interface ListingProduct {
    id: string
    slug: string
    productId: string
    name: string
    image: string | null
    price: string
    basePrice: string
    discountPercent: number
    isDiscounted: boolean
    colorTemperatures: ProductColorTemp[]
    colorKeys: string[]
    /**
     * Spec values by spec key — the UNION across the family, so a card is findable by any of
     * its variants' wattages. `nl-a603` spans 6W to 30W and is one tile.
     */
    specs: Record<string, string[]>
    available: boolean
    createdAt: string
    isFeatured: boolean
}

const COLOR_TEMP_LABEL: Record<ProductColorTemp, string> = {
    WARM_3000K: "3000K",
    COOL_4000K: "4000K",
    WHITE_6500K: "6500K",
}

/**
 * The catalogue's own order for colour temperature — warm to cool, which is how a lighting
 * spec sheet lists them and how somebody choosing thinks about them. Not alphabetical, which
 * would put 4000K first.
 */
const COLOR_TEMP_ORDER: readonly ProductColorTemp[] = ["WARM_3000K", "COOL_4000K", "WHITE_6500K"]

type ListingRow = CardView<ProductListCard>

/**
 * Flatten one row, folding in the attributes of every variant in its family.
 *
 * This is the subtle part. The listing shows ONE card per family, so the card standing for
 * `nl-a603` is whichever variant sorted first — and filtering on that representative's own
 * attributes would hide the family from a customer who filtered for a colour temperature only
 * its 30W variant offers. The union across the family is the honest answer to "does this
 * product come in 4000K", and it is what the product page then shows when they click through.
 */
export function toListingProduct(
    row: ListingRow,
    family: readonly ListingRow[],
    locale: Locale
): ListingProduct {
    const temps = new Set<ProductColorTemp>()
    const colors = new Set<string>()
    const specs = new Map<string, Set<string>>()
    let available = false

    for (const member of family) {
        for (const temp of member.colorTemperatures) temps.add(temp)
        for (const entry of member.availableColors) colors.add(entry.color.key)
        const level = member.stockLevels[0]
        if (level && level.onHand - level.reserved > 0) available = true

        for (const [key, value] of specValuesOf(member.specs, locale)) {
            const values = specs.get(key) ?? new Set<string>()
            values.add(value)
            specs.set(key, values)
        }
    }

    return {
        id: row.id,
        slug: row.slug,
        productId: row.productId,
        /*
         * The FAMILY's name when the tile stands for more than one product, the product's own
         * otherwise.
         *
         * A card for `nl-a603` was labelled `nl-a603-6w` because the first member won, which
         * told a reader the tile was the 6W when it is all five. A family of one has no such
         * problem and keeps its own name — a family name there would be the same string with
         * less detail.
         *
         * Today both names are SKUs in this catalogue's data, so the visible change is small.
         * The point is that the day an operator types a real family name in the panel, the
         * listing shows it without another deploy.
         */
        name:
            family.length > 1
                ? (row.family?.translations[0]?.name ?? row.translations[0]?.name ?? row.productId)
                : (row.translations[0]?.name ?? row.productId),
        image: row.images[0]?.url ?? null,
        price: row.price,
        basePrice: row.basePrice,
        discountPercent: row.discountPercent,
        isDiscounted: row.isDiscounted,
        colorTemperatures: [...temps].sort(
            (a, b) => COLOR_TEMP_ORDER.indexOf(a) - COLOR_TEMP_ORDER.indexOf(b)
        ),
        colorKeys: [...colors],
        specs: Object.fromEntries([...specs].map(([key, values]) => [key, [...values]])),
        available,
        createdAt: row.createdAt.toISOString(),
        isFeatured: row.isFeatured,
    }
}

/**
 * Build the facet set from the products actually on the page.
 *
 * A facet that matches nothing is not rendered at all — a "6500K" chip on a listing where no
 * product offers it is a control whose only outcome is an empty grid.
 */
export function buildFacets(
    products: readonly ListingProduct[],
    colorNames: ReadonlyMap<string, { name: string; hex: string }>,
    locale: Locale
): ProductFacets {
    void locale // the colour names arrive already localised; kept for symmetry with callers

    const tempCounts = new Map<ProductColorTemp, number>()
    const colorCounts = new Map<string, number>()

    for (const product of products) {
        for (const temp of product.colorTemperatures) {
            tempCounts.set(temp, (tempCounts.get(temp) ?? 0) + 1)
        }
        for (const key of product.colorKeys) {
            colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1)
        }
    }

    return {
        specs: [],
        colorTemperatures: COLOR_TEMP_ORDER.filter((temp) => tempCounts.has(temp)).map((temp) => ({
            value: temp,
            label: COLOR_TEMP_LABEL[temp],
            count: tempCounts.get(temp)!,
        })),
        colors: [...colorCounts.entries()]
            .map(([key, count]) => ({
                value: key,
                label: colorNames.get(key)?.name ?? key,
                hex: colorNames.get(key)?.hex,
                count,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        inStock: products.filter((p) => p.available).length,
        onSale: products.filter((p) => p.isDiscounted).length,
        total: products.length,
    }
}

export interface ListingFilters {
    colorTemperatures: string[]
    colors: string[]
    /** Selected values by spec key — `{ maximum_wattage: ["18", "30"] }`. */
    specs: Record<string, string[]>
    inStockOnly: boolean
    onSaleOnly: boolean
    sort: SortKey
}

export const EMPTY_FILTERS: ListingFilters = {
    colorTemperatures: [],
    colors: [],
    specs: {},
    inStockOnly: false,
    onSaleOnly: false,
    sort: "featured",
}

/**
 * Apply the filters, then the sort.
 *
 * Within a dimension the filters are OR (4000K **or** 6500K); across dimensions they are AND
 * (4000K **and** in stock). That is the convention every shop uses and the only one that makes
 * a multi-select chip group behave the way it looks like it should.
 *
 * PRICE SORTS ON THE EFFECTIVE PRICE, not on `products.price`. A discount is an overlay
 * resolved after the query (§13.2), so ordering in SQL would sort by the struck-through number
 * and put a discounted product in the wrong place — the customer would see "EGP 850" sitting
 * between two thousand-pound items.
 */
export function applyFilters(
    products: readonly ListingProduct[],
    filters: ListingFilters
): ListingProduct[] {
    const filtered = products.filter((product) => {
        if (filters.inStockOnly && !product.available) return false
        if (filters.onSaleOnly && !product.isDiscounted) return false
        if (
            filters.colorTemperatures.length > 0 &&
            !filters.colorTemperatures.some((temp) => (product.colorTemperatures as string[]).includes(temp))
        ) {
            return false
        }
        if (filters.colors.length > 0 && !filters.colors.some((key) => product.colorKeys.includes(key))) {
            return false
        }

        // Specs follow the same rule as everything else: OR inside one spec, AND across specs.
        // 18W or 30W, AND aluminium.
        for (const [key, selected] of Object.entries(filters.specs)) {
            if (selected.length === 0) continue
            const values = product.specs[key]
            if (!values || !selected.some((value) => values.includes(value))) return false
        }

        return true
    })

    const byPrice = (a: ListingProduct, b: ListingProduct) => Number(a.price) - Number(b.price)

    switch (filters.sort) {
        case "price-asc":
            return [...filtered].sort(byPrice)
        case "price-desc":
            return [...filtered].sort((a, b) => byPrice(b, a))
        case "newest":
            return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        case "featured":
        default:
            // The order the service already returned: featured first, then the operator's own
            // `displayOrder` / `order`. Not re-sorted — that ordering is an editorial decision
            // made in the admin, and "featured" means "leave it alone".
            return filtered
    }
}

export function activeFilterCount(filters: ListingFilters): number {
    return (
        filters.colorTemperatures.length +
        filters.colors.length +
        Object.values(filters.specs).reduce((total, values) => total + values.length, 0) +
        (filters.inStockOnly ? 1 : 0) +
        (filters.onSaleOnly ? 1 : 0)
    )
}


/* ------------------------------------------------------------------- specs */

/**
 * A spec that earned a filter control.
 *
 * `key` is the `SpecDefinition` primary key, so the URL parameter (`spec.maximum_wattage=18,30`)
 * is stable across locales — the label moves with the language, the identity does not.
 */
export interface SpecFacet {
    key: string
    label: string
    unit: string | null
    /** NUMBER specs sort numerically; TEXT alphabetically. */
    numeric: boolean
    options: FacetOption[]
}

/**
 * A spec with fewer than two values narrows nothing; with more than this it is an identifier.
 *
 * 20 is set against the real distribution rather than picked round. On Magnetic Track the two
 * ends are Maximum Wattage at 14 distinct values — 6W through 36W, the single most useful
 * filter on a lighting listing — and Product Dimensions at 35, which is nearly one value per
 * product and is an identifier wearing a spec's clothes. A cap of 12 excluded the wattage,
 * which is the opposite of what this rule is for.
 */
const MAX_SPEC_OPTIONS = 20

/**
 * One product's spec values, keyed by spec, as display strings.
 *
 * A `ProductSpec` row carries exactly one of three value columns depending on its definition's
 * type, and the placeholder `"-"` means "not recorded" rather than a value — the transform
 * wrote it for the v1 rows that had no measurement, and the admin's data-quality queue counts
 * them. It is never a facet option.
 */
export function specValuesOf(
    specs: readonly {
        specKey: string
        valueNumber: unknown
        valueEn: string | null
        valueAr: string | null
        valueBool: boolean | null
    }[],
    locale: Locale
): Map<string, string> {
    const values = new Map<string, string>()
    for (const spec of specs) {
        let value: string | null = null
        if (spec.valueNumber !== null && spec.valueNumber !== undefined) {
            // Decimal(12,3) — trailing zeros off, so 18.000 reads as 18.
            value = String(Number(spec.valueNumber))
        } else if (spec.valueBool !== null) {
            value = spec.valueBool ? "true" : "false"
        } else {
            const text = locale === "ar" ? (spec.valueAr ?? spec.valueEn) : spec.valueEn
            value = text?.trim() || null
        }
        if (!value || value === PLACEHOLDER) continue
        values.set(spec.specKey, value)
    }
    return values
}

/**
 * A number, in the digits the reader's language writes numbers in.
 *
 * `specValuesOf` renders a numeric spec from `valueNumber`, which is correct and deliberate:
 * that string is a KEY — it goes in the URL, it is compared against the filter, and it has to
 * mean the same thing in both languages. But it is also what the tile and the filter chip
 * PRINT, so an Arabic listing showed "أقصى قوة كهربائية 10-40 W" beside
 * "تيار متردد ١٧٥–٢٦٥ فولت" — two number systems, one row apart.
 *
 * So the key stays Western and the LABEL is localised. Display and identity are different jobs
 * and this is the line between them.
 */
export function localiseDigits(value: string, locale: Locale): string {
    if (locale !== "ar") return value
    return value.replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)))
}

export interface SpecDefinitionView {
    key: string
    label: string
    unit: string | null
    numeric: boolean
    order: number
}

/**
 * Build the spec facets for a listing.
 *
 * `declared` is `SubCategorySpec` in the operator's order, so the controls appear in the order
 * the admin put them in rather than alphabetically or by however the values happened to sort.
 */
export function buildSpecFacets(
    products: readonly ListingProduct[],
    declared: readonly SpecDefinitionView[],
    locale: Locale = "en"
): SpecFacet[] {
    const facets: SpecFacet[] = []

    for (const definition of [...declared].sort((a, b) => a.order - b.order)) {
        const counts = new Map<string, number>()
        for (const product of products) {
            for (const value of product.specs[definition.key] ?? []) {
                counts.set(value, (counts.get(value) ?? 0) + 1)
            }
        }

        // Both rules, applied to the real distribution — see the header comment.
        if (counts.size < 2 || counts.size > MAX_SPEC_OPTIONS) continue

        // `value` is the filter key and stays as it is; `label` is what the chip prints.
        const options = [...counts.entries()].map(([value, count]) => ({
            value,
            label: localiseDigits(value, locale),
            count,
        }))
        options.sort((a, b) =>
            definition.numeric
                ? Number(a.value) - Number(b.value)
                : a.value.localeCompare(b.value)
        )

        facets.push({
            key: definition.key,
            label: definition.label,
            unit: definition.unit,
            numeric: definition.numeric,
            options,
        })
    }

    return facets
}


/* ------------------------------------------------------------- quick specs */

export interface QuickSpec {
    label: string
    value: string
}

/**
 * The two or three specs worth printing on a TILE.
 *
 * `productListCardInclude` has been loading every spec of every product on the listing since
 * the filters were built, and the card rendered none of them — so a lighting catalogue showed a
 * photograph, a name and a price, and made a customer open each tile to learn its wattage. On a
 * technical catalogue that is the number they are shopping BY.
 *
 * Which specs, and in what order, is the operator's answer and not a guess: `definitions` is
 * `SubCategorySpec` in its configured order, the same rows that decide the filter panel. The
 * first `max` that this product actually has a value for win.
 *
 * A tile is a card for a FAMILY, so a spec can hold several values — `nl-a603` spans 6W to 30W.
 * A list of five numbers on a tile is noise, so numeric specs collapse to a range and text
 * specs to their single value or nothing. Better silent than crowded.
 */
export function quickSpecs(
    product: Pick<ListingProduct, "specs">,
    definitions: readonly SpecDefinitionView[],
    locale: Locale = "en",
    max = 3
): QuickSpec[] {
    const out: QuickSpec[] = []

    for (const definition of definitions) {
        if (out.length >= max) break
        const values = product.specs[definition.key]
        if (!values || values.length === 0) continue

        const collapsed = collapse(values)
        if (!collapsed) continue
        const value = localiseDigits(collapsed, locale)
        out.push({ label: definition.label, value: definition.unit ? `${value} ${definition.unit}` : value })
    }

    return out
}

/**
 * Several values, as one legible string.
 *
 * Numbers become a span because the ends are what a reader needs — "6-30" answers "does this
 * come in the size I want" and "6, 9, 12, 18, 30" makes them read five numbers to answer it.
 * Anything non-numeric with more than one value is dropped: "White, Black, Grey" on a 2cm-wide
 * tile is worse than the swatches the card already shows.
 *
 * THE ENDS ARE THE STORED STRINGS, not the parsed numbers re-printed. Parsing decides the
 * ORDER and nothing else, because `String(6)` is "6" in every locale while the Arabic rows in
 * this catalogue hold "٦" — so re-printing turned an Arabic tile that read "٨٥–٢٦٥ فولت" on
 * one row into "6-8 W" on the next. Round-tripping a value through a number also drops
 * whatever the operator typed around it.
 */
function collapse(values: readonly string[]): string | null {
    if (values.length === 1) return values[0] ?? null

    const parsed = values.map((value) => ({ value, number: Number.parseFloat(normaliseDigits(value)) }))
    if (parsed.some((entry) => !Number.isFinite(entry.number))) return null

    const sorted = [...parsed].sort((a, b) => a.number - b.number)
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    // Every variant carrying the same figure is one figure, not a range of it to itself.
    return low.number === high.number ? low.value : `${low.value}-${high.value}`
}

/** Arabic-Indic digits are digits. `parseFloat("٦")` is NaN, which would drop the whole spec. */
function normaliseDigits(value: string): string {
    return value.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
}


/* ------------------------------------------------------------- filters ⇄ URL */

/**
 * The filter state IS the query string, in one place.
 *
 * The listing page read and wrote these parameters inline. The search results page needs the
 * same six, and a second hand-rolled copy is how `sale=1` on one page becomes `sale=true` on
 * the other — so the encoding lives here, next to the filters it encodes, and both pages call
 * it. They are pure functions over a plain map, which also makes them testable without a page.
 */
export function filtersFromParams(params: URLSearchParams): ListingFilters {
    const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean)
    const specs: Record<string, string[]> = {}
    for (const [key, value] of params.entries()) {
        if (!key.startsWith("spec.")) continue
        const values = value.split(",").filter(Boolean)
        if (values.length) specs[key.slice(5)] = values
    }
    const sort = params.get("sort")

    return {
        colorTemperatures: list("temp"),
        colors: list("finish"),
        specs,
        inStockOnly: params.get("stock") === "in",
        onSaleOnly: params.get("sale") === "1",
        sort: isSortKey(sort) ? sort : EMPTY_FILTERS.sort,
    }
}

/**
 * The inverse. `keep` carries parameters that are not filters — the search term, above all,
 * which must survive every tick of a checkbox.
 *
 * A default is written as ABSENCE rather than as `sort=featured`: the canonical URL for an
 * unfiltered listing is the bare path, and a filter panel that adds six neutral parameters
 * gives every listing page a second address for the same content.
 */
export function filtersToParams(filters: ListingFilters, keep: Record<string, string> = {}): URLSearchParams {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(keep)) {
        if (value) params.set(key, value)
    }
    if (filters.colorTemperatures.length) params.set("temp", filters.colorTemperatures.join(","))
    if (filters.colors.length) params.set("finish", filters.colors.join(","))
    for (const [key, values] of Object.entries(filters.specs)) {
        if (values.length) params.set(`spec.${key}`, values.join(","))
    }
    if (filters.inStockOnly) params.set("stock", "in")
    if (filters.onSaleOnly) params.set("sale", "1")
    if (filters.sort !== EMPTY_FILTERS.sort) params.set("sort", filters.sort)
    return params
}
