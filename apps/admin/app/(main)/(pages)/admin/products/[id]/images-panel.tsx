"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { setProductColors } from "@/app/action/reference-actions"
import {
    deleteProductImage,
    reorderProductImages,
    setImageAlt,
    setImageColor,
    uploadProductImage,
} from "@/app/action/media-actions"

export interface ImageRow {
    id: string
    url: string
    publicId: string
    order: number
    colorId: string | null
    colorKey: string | null
    width: number | null
    height: number | null
    altEn: string | null
    altAr: string | null
}

export interface ColorOption {
    id: string
    key: string
    hex: string | null
}

/**
 * Product photographs.
 *
 * Order is the model, not a "main image" flag: position 0 is what listings show and what the
 * gallery opens on. Two sources of truth for "which one is the main photo" is one more than
 * can be kept in agreement.
 *
 * Reordering is by explicit move rather than drag: a drag target is invisible to a keyboard
 * and to anyone who cannot hold a pointer steady, and the buttons say what they will do.
 */
export function ImagesPanel({
    productId,
    sku,
    images,
    colors,
    offeredColorIds,
}: {
    productId: string
    sku: string
    images: ImageRow[]
    colors: ColorOption[]
    offeredColorIds: string[]
}) {
    const [pending, start] = useTransition()
    const [colorForUpload, setColorForUpload] = useState<string>("")
    const fileInput = useRef<HTMLInputElement>(null)

    const call = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
        start(async () => {
            const result = await fn()
            if (result.ok) toast.success(result.message ?? "Saved.")
            else toast.error(result.error ?? "Something went wrong.")
        })

    const move = (index: number, delta: number) => {
        const next = [...images]
        const target = index + delta
        if (target < 0 || target >= next.length) return
        ;[next[index], next[target]] = [next[target]!, next[index]!]
        call(() => reorderProductImages(productId, next.map((image) => image.id)))
    }

    const submitUpload = (formData: FormData) => {
        formData.set("productId", productId)
        formData.set("colorId", colorForUpload)
        call(async () => {
            const result = await uploadProductImage(formData)
            if (result.ok && fileInput.current) fileInput.current.value = ""
            return result
        })
    }

    return (
        <div className="space-y-8">
            <OfferedColors productId={productId} colors={colors} offered={offeredColorIds} pending={pending} call={call} />

            <form action={submitUpload} className="bg-card rounded-lg border p-4 shadow-sm space-y-3 max-w-2xl">
                <h3 className="font-semibold">Add a photo</h3>
                <p className="text-sm text-muted-foreground">
                    JPEG, PNG, WebP or AVIF, up to 10 MB. It goes to Cloudinary under this product&rsquo;s own path and
                    appears on the storefront as soon as it is saved.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="file">Image file</Label>
                        <Input
                            id="file"
                            name="file"
                            type="file"
                            ref={fileInput}
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="upload-color">Colour shown (optional)</Label>
                        <select
                            id="upload-color"
                            value={colorForUpload}
                            onChange={(e) => setColorForUpload(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <option value="">Not colour-specific</option>
                            {colors.map((color) => (
                                <option key={color.id} value={color.id}>
                                    {color.key.toLowerCase().replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button type="submit" disabled={pending}>
                    {pending ? "Uploading…" : "Upload"}
                </Button>
            </form>

            {images.length === 0 ? (
                <p className="text-muted-foreground">
                    This product has no photographs. It will render with a placeholder on the storefront.
                </p>
            ) : (
                <div className="space-y-4">
                    <h3 className="font-semibold">
                        {images.length} photo{images.length === 1 ? "" : "s"}
                        <span className="font-normal text-muted-foreground"> — the first is what listings show</span>
                    </h3>

                    {images.map((image, index) => (
                        <div key={image.id} className="bg-card rounded-lg border p-4 shadow-sm flex flex-wrap gap-4">
                            <div className="relative shrink-0">
                                <Image
                                    src={image.url}
                                    alt={image.altEn ?? `${sku} photo ${index + 1}`}
                                    width={120}
                                    height={120}
                                    className="rounded-md border object-cover h-[120px] w-[120px]"
                                />
                                {index === 0 && <Badge className="absolute -top-2 -left-2">main</Badge>}
                            </div>

                            <div className="min-w-0 flex-1 space-y-3">
                                <p className="font-mono text-xs text-muted-foreground break-all">{image.publicId}</p>
                                <p className="text-xs text-muted-foreground">
                                    {image.width && image.height ? `${image.width}×${image.height}` : "dimensions not recorded"}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor={`color-${image.id}`} className="text-xs">
                                            Colour shown
                                        </Label>
                                        <select
                                            id={`color-${image.id}`}
                                            defaultValue={image.colorId ?? ""}
                                            disabled={pending}
                                            onChange={(e) =>
                                                call(() => setImageColor(productId, image.id, e.target.value || null))
                                            }
                                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            <option value="">Not colour-specific</option>
                                            {colors.map((color) => (
                                                <option key={color.id} value={color.id}>
                                                    {color.key.toLowerCase().replace(/_/g, " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <AltEditor
                                        productId={productId}
                                        image={image}
                                        pending={pending}
                                        call={call}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={pending || index === 0}
                                    onClick={() => move(index, -1)}
                                >
                                    ↑ Earlier
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={pending || index === images.length - 1}
                                    onClick={() => move(index, 1)}
                                >
                                    ↓ Later
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" size="sm" variant="destructive" disabled={pending}>
                                            Remove
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                It disappears from the storefront immediately. The file is deleted from
                                                Cloudinary too, unless another product still uses the same one.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive text-white hover:bg-destructive/90"
                                                onClick={() => call(() => deleteProductImage(productId, image.id))}
                                            >
                                                Remove
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/** Alt text is the image's translation, so it is paired the same way the words are (§13.2). */
function AltEditor({
    productId,
    image,
    pending,
    call,
}: {
    productId: string
    image: ImageRow
    pending: boolean
    call: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => void
}) {
    const [altEn, setAltEn] = useState(image.altEn ?? "")
    const [altAr, setAltAr] = useState(image.altAr ?? "")
    const dirty = altEn !== (image.altEn ?? "") || altAr !== (image.altAr ?? "")

    return (
        <div className="space-y-1.5">
            <Label className="text-xs">Alt text — describes the photo to a screen reader</Label>
            <Input
                aria-label="Alt text in English"
                value={altEn}
                placeholder="English"
                onChange={(e) => setAltEn(e.target.value)}
            />
            <Input
                aria-label="Alt text in Arabic"
                dir="rtl"
                value={altAr}
                placeholder="العربية"
                onChange={(e) => setAltAr(e.target.value)}
            />
            <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending || !dirty}
                onClick={() => call(() => setImageAlt(productId, image.id, altEn, altAr))}
            >
                {dirty ? "Save alt text" : "Saved"}
            </Button>
        </div>
    )
}

/**
 * Which colours the product is offered in.
 *
 * `ProductAvailableColor` drives the swatches a customer picks from, and it was readable on the
 * product header and editable nowhere — so a fixture that started coming in brass stayed
 * black-only until someone wrote SQL. Sixteen products currently offer no colour at all, which
 * the data-quality queue reports and this is the place to answer.
 *
 * It sits above the photographs because a photograph can be linked to a colour, and linking one
 * to a colour the product is not offered in is a question with no answer.
 */
function OfferedColors({
    productId,
    colors,
    offered,
    pending,
    call,
}: {
    productId: string
    colors: ColorOption[]
    offered: string[]
    pending: boolean
    call: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => void
}) {
    const [selected, setSelected] = useState<string[]>(offered)
    const dirty = selected.length !== offered.length || selected.some((id, i) => id !== offered[i])

    return (
        <section className="bg-card rounded-lg border p-4 shadow-sm space-y-3">
            <h3 className="font-semibold">Colours offered</h3>
            <p className="text-sm text-muted-foreground">
                What a customer can choose between. The order here is the order they appear in.
            </p>
            <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                    const index = selected.indexOf(color.id)
                    const chosen = index >= 0
                    return (
                        <Button
                            key={color.id}
                            type="button"
                            size="sm"
                            variant={chosen ? "default" : "secondary"}
                            disabled={pending}
                            onClick={() =>
                                setSelected((current) =>
                                    current.includes(color.id)
                                        ? current.filter((id) => id !== color.id)
                                        : [...current, color.id]
                                )
                            }
                        >
                            <span
                                className="h-3 w-3 rounded-full border mr-2 shrink-0"
                                style={{ background: color.hex ?? "#888" }}
                                aria-hidden
                            />
                            {color.key.toLowerCase().replace(/_/g, " ")}
                            {chosen && <span className="ml-2 text-xs opacity-70">{index + 1}</span>}
                        </Button>
                    )
                })}
            </div>
            <Button disabled={pending || !dirty} onClick={() => call(() => setProductColors(productId, selected))}>
                {dirty ? "Save colours" : "Saved"}
            </Button>
        </section>
    )
}
