"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProductAction } from "@/app/action/catalog-actions"

interface Option {
    id: string
    name: string
}
interface Family extends Option {
    subCategoryId: string
    variantType: string | null
}

const COLOUR_TEMPERATURES = [
    { key: "WARM_3000K", label: "Warm 3000K" },
    { key: "COOL_4000K", label: "Cool 4000K" },
    { key: "WHITE_6500K", label: "White 6500K" },
] as const

/**
 * Creating a product.
 *
 * The form asks for the minimum that makes a product real and nothing else — everything
 * optional belongs on the workbench, where it can be seen next to what it affects. Photographs
 * are not here on purpose: a file upload inside a create form means a half-created product when
 * the upload fails, and the workbench already does images properly.
 *
 * Both names are required. A product created in English only renders as a gap on the Arabic
 * storefront, and the translation queue would report it tomorrow — refusing now is cheaper than
 * reporting it forever.
 */
export function NewProductForm({ subCategories, families }: { subCategories: Option[]; families: Family[] }) {
    const router = useRouter()
    const [pending, start] = useTransition()

    const [sku, setSku] = useState("")
    const [slug, setSlug] = useState("")
    const [subCategoryId, setSubCategoryId] = useState("")
    const [familyId, setFamilyId] = useState("")
    const [variantValue, setVariantValue] = useState("")
    const [price, setPrice] = useState("")
    const [openingStock, setOpeningStock] = useState("")
    const [temps, setTemps] = useState<string[]>([])
    const [nameEn, setNameEn] = useState("")
    const [nameAr, setNameAr] = useState("")
    const [descriptionEn, setDescriptionEn] = useState("")
    const [descriptionAr, setDescriptionAr] = useState("")

    // A family belongs to one sub-category, so offering the others would offer a contradiction.
    const availableFamilies = families.filter((f) => f.subCategoryId === subCategoryId)
    const chosenFamily = availableFamilies.find((f) => f.id === familyId)

    const submit = () =>
        start(async () => {
            const result = await createProductAction({
                sku,
                // Blank means "use the SKU" — the service decides, so the rule lives in one place.
                slug: slug.trim(),
                subCategoryId,
                familyId: familyId || null,
                variantValue: variantValue.trim() || null,
                price,
                colorTemperatures: temps,
                nameEn,
                nameAr,
                descriptionEn: descriptionEn.trim() || null,
                descriptionAr: descriptionAr.trim() || null,
                openingStock: openingStock.trim() === "" ? null : Number(openingStock),
            })

            if (result.ok && result.productId) {
                toast.success(result.message ?? "Created.")
                // Straight to Photos: it is inactive until it has one, and that is the next thing.
                router.push(`/admin/products/${result.productId}?tab=images`)
            } else if (!result.ok) {
                toast.error(result.error)
            }
        })

    const ready = sku.trim() && subCategoryId && price.trim() && nameEn.trim() && nameAr.trim()

    return (
        <form
            className="max-w-3xl space-y-8"
            onSubmit={(e) => {
                e.preventDefault()
                submit()
            }}
        >
            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                <h2 className="font-semibold">Identity</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="sku">SKU</Label>
                        <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="nl-p-12w" required />
                        <p className="text-xs text-muted-foreground">The business code. It can be changed later.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="slug">URL</Label>
                        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={sku || "leave blank to use the SKU"} />
                        <p className="text-xs text-muted-foreground">Shared across both languages. Renaming it later keeps the old one working.</p>
                    </div>
                </div>
            </section>

            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                <h2 className="font-semibold">Where it belongs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="sub">Sub-category</Label>
                        <select
                            id="sub"
                            required
                            value={subCategoryId}
                            onChange={(e) => {
                                setSubCategoryId(e.target.value)
                                setFamilyId("")
                            }}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <option value="">—</option>
                            {subCategories.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="family">Family (optional)</Label>
                        <select
                            id="family"
                            value={familyId}
                            disabled={!subCategoryId}
                            onChange={(e) => setFamilyId(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                        >
                            <option value="">Standalone product</option>
                            {availableFamilies.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            {subCategoryId
                                ? "A family groups the wattages or sizes of one fixture into a single card."
                                : "Choose a sub-category first — families belong to one."}
                        </p>
                    </div>
                </div>

                {chosenFamily && (
                    <div className="space-y-1.5">
                        <Label htmlFor="variant">
                            {chosenFamily.variantType ? `Variant (${chosenFamily.variantType})` : "Variant"}
                        </Label>
                        <Input
                            id="variant"
                            value={variantValue}
                            onChange={(e) => setVariantValue(e.target.value)}
                            placeholder="12w"
                        />
                        {/* This is what distinguishes it from its siblings on the storefront. */}
                        <p className="text-xs text-muted-foreground">What makes this one different from the rest of {chosenFamily.name}.</p>
                    </div>
                )}
            </section>

            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                <h2 className="font-semibold">Price and stock</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="price">Price (EGP)</Label>
                        <Input
                            id="price"
                            required
                            inputMode="decimal"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="tabular-nums"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="stock">Opening stock (optional)</Label>
                        <Input
                            id="stock"
                            inputMode="numeric"
                            value={openingStock}
                            onChange={(e) => setOpeningStock(e.target.value)}
                            className="tabular-nums"
                        />
                        <p className="text-xs text-muted-foreground">
                            Recorded as a movement in the ledger, not typed into a total.
                        </p>
                    </div>
                </div>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium mb-1">Colour temperatures</legend>
                    <div className="flex flex-wrap gap-2">
                        {COLOUR_TEMPERATURES.map((temp) => (
                            <Button
                                key={temp.key}
                                type="button"
                                size="sm"
                                variant={temps.includes(temp.key) ? "default" : "secondary"}
                                onClick={() =>
                                    setTemps((current) =>
                                        current.includes(temp.key)
                                            ? current.filter((t) => t !== temp.key)
                                            : [...current, temp.key]
                                    )
                                }
                            >
                                {temp.label}
                            </Button>
                        ))}
                    </div>
                </fieldset>
            </section>

            <section className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
                <h2 className="font-semibold">Name</h2>
                <p className="text-sm text-muted-foreground">
                    Both languages are required. A product with no Arabic name renders as a gap on the Arabic
                    storefront.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name-en">Name (English)</Label>
                        <Input id="name-en" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="name-ar">Name (Arabic)</Label>
                        <Input id="name-ar" required dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="desc-en">Description (English)</Label>
                        <Input id="desc-en" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="desc-ar">Description (Arabic)</Label>
                        <Input id="desc-ar" dir="rtl" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" disabled={pending || !ready}>
                    {pending ? "Creating…" : "Create product"}
                </Button>
                <p className="text-sm text-muted-foreground">
                    It is created <strong>hidden</strong>. Add a photo on the next screen, then make it live.
                </p>
            </div>
        </form>
    )
}
