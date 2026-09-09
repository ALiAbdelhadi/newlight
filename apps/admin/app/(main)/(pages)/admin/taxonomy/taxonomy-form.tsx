"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "@/components/app-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TaxonomyInput } from "@/lib/services/taxonomy-service"
import {
    createCategory,
    createSubCategory,
    removeCategoryImage,
    removeSubCategoryImage,
    updateCategory,
    updateSubCategory,
    uploadCategoryImage,
    uploadSubCategoryImage,
} from "@/app/action/taxonomy-actions"
import { NativeSelect } from "@/components/ui/native-select"

interface Existing {
    id: string
    imageUrl: string | null
    order: number
    isActive: boolean
    translations: Array<{
        locale: string
        slug: string
        name: string
        description: string | null
        metaTitle: string | null
        metaDescription: string | null
    }>
}

const FIELDS = [
    { key: "name", label: "Name", required: true },
    { key: "slug", label: "URL", required: true },
    { key: "description", label: "Description", required: false },
    { key: "metaTitle", label: "Meta title", required: false },
    { key: "metaDescription", label: "Meta description", required: false },
] as const

type FieldKey = (typeof FIELDS)[number]["key"]
type LocaleValues = Record<FieldKey, string>

function initial(existing: Existing | null, locale: string): LocaleValues {
    const t = existing?.translations.find((x) => x.locale === locale)
    return {
        name: t?.name ?? "",
        slug: t?.slug ?? "",
        description: t?.description ?? "",
        metaTitle: t?.metaTitle ?? "",
        metaDescription: t?.metaDescription ?? "",
    }
}

export function TaxonomyForm({
    kind,
    existing,
    categories,
    categoryId,
}: {
    kind: "category" | "subCategory"
    existing: Existing | null
    categories?: Array<{ id: string; name: string }>
    categoryId?: string
}) {
    const router = useRouter()
    const [pending, start] = useTransition()

    const [values, setValues] = useState<Record<"en" | "ar", LocaleValues>>({
        en: initial(existing, "en"),
        ar: initial(existing, "ar"),
    })
    const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "")
    const [order, setOrder] = useState(String(existing?.order ?? 0))
    const [isActive, setIsActive] = useState(existing?.isActive ?? true)
    const [parent, setParent] = useState(categoryId ?? "")
    const fileInput = useRef<HTMLInputElement>(null)

    const uploadImage = (file: File) =>
        start(async () => {
            if (!existing) return
            const formData = new FormData()
            formData.set("file", file)
            const result =
                kind === "category"
                    ? await uploadCategoryImage(existing.id, formData)
                    : await uploadSubCategoryImage(existing.id, formData)
            if (result.ok) {
                toast.success(result.message ?? "Uploaded.")
                if (result.url) setImageUrl(result.url)
                if (fileInput.current) fileInput.current.value = ""
            } else {
                toast.error(result.error)
            }
        })

    const removeImage = () =>
        start(async () => {
            if (!existing) return
            const result = kind === "category" ? await removeCategoryImage(existing.id) : await removeSubCategoryImage(existing.id)
            if (result.ok) {
                toast.success(result.message ?? "Removed.")
                setImageUrl("")
            } else {
                toast.error(result.error)
            }
        })

    const set = (locale: "en" | "ar", field: FieldKey, value: string) =>
        setValues((v) => ({ ...v, [locale]: { ...v[locale], [field]: value } }))

    const build = (): TaxonomyInput => ({
        imageUrl: imageUrl.trim() || null,
        order: Number(order) || 0,
        isActive,
        translations: {
            en: {
                slug: values.en.slug,
                name: values.en.name,
                description: values.en.description || null,
                metaTitle: values.en.metaTitle || null,
                metaDescription: values.en.metaDescription || null,
            },
            ar: {
                slug: values.ar.slug,
                name: values.ar.name,
                description: values.ar.description || null,
                metaTitle: values.ar.metaTitle || null,
                metaDescription: values.ar.metaDescription || null,
            },
        },
    })

    const submit = () =>
        start(async () => {
            const input = build()
            const result =
                kind === "category"
                    ? existing
                        ? await updateCategory(existing.id, input)
                        : await createCategory(input)
                    : existing
                      ? await updateSubCategory(existing.id, parent, input)
                      : await createSubCategory(parent, input)

            if (result.ok) {
                toast.success(result.message ?? "Saved.")
                router.push("/admin/taxonomy")
            } else {
                toast.error(result.error)
            }
        })

    const ready =
        values.en.name.trim() &&
        values.ar.name.trim() &&
        (kind === "category" || parent)

    return (
        <form
            className="max-w-4xl space-y-6"
            onSubmit={(e) => {
                e.preventDefault()
                submit()
            }}
        >
            {kind === "subCategory" && categories && (
                <section className="rounded-lg border bg-card p-3 space-y-1.5">
                    <Label htmlFor="parent">Category</Label>
                    <NativeSelect
                        id="parent"
                        required
                        value={parent}
                        onChange={(e) => setParent(e.target.value)}
                        >
                        <option value="">—</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </NativeSelect>
                    <p className="text-xs text-muted-foreground">
                        Moving it changes the URL of every product inside.
                    </p>
                </section>
            )}

            {FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["en", "ar"] as const).map((locale) => {
                        const id = `${locale}-${field.key}`
                        return (
                            <div key={locale} className="space-y-1.5">
                                <Label htmlFor={id} className="flex items-center gap-2">
                                    {field.label}
                                    <span className="text-xs uppercase text-muted-foreground">{locale}</span>
                                    {field.required && !values[locale][field.key].trim() && (
                                        <span className="text-destructive text-xs">required</span>
                                    )}
                                </Label>
                                <Input
                                    id={id}
                                    dir={locale === "ar" ? "rtl" : "ltr"}
                                    value={values[locale][field.key]}
                                    onChange={(e) => set(locale, field.key, e.target.value)}
                                    placeholder={
                                        field.key === "slug" && !existing
                                            ? "leave blank to build it from the name"
                                            : undefined
                                    }
                                />
                                {field.key === "slug" && existing && (
                                    <p className="text-xs text-muted-foreground">
                                        Changing this retires the old URL to a redirect.
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}

            <section className="rounded-lg border bg-card p-3 grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                    <Label>Photo</Label>
                    {existing ? (
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-surface-sunk">
                                {imageUrl ? (
                                    <Image src={imageUrl} alt="" width={80} height={80} className="size-full object-cover" />
                                ) : (
                                    <span className="text-2xs text-muted-foreground">None</span>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/avif"
                                    disabled={pending}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) uploadImage(file)
                                    }}
                                    className="max-w-xs"
                                />
                                <p className="text-2xs text-muted-foreground">JPEG, PNG, WebP or AVIF, up to 10 MB.</p>
                            </div>
                            {imageUrl && (
                                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={removeImage}>
                                    Remove
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Create it first, then upload a photo from its own page.
                        </p>
                    )}
                    <Label htmlFor="image" className="text-2xs text-muted-foreground">
                        Or paste an image URL directly
                    </Label>
                    <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="order">Order</Label>
                        <Input id="order" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} className="tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="active">Visible on the storefront</Label>
                        <Button
                            id="active"
                            type="button"
                            variant={isActive ? "default" : "secondary"}
                            onClick={() => setIsActive((v) => !v)}
                            className="w-full"
                        >
                            {isActive ? "Visible" : "Hidden"}
                        </Button>
                    </div>
                </div>
            </section>

            <div className="flex gap-3">
                <Button type="submit" disabled={pending || !ready}>
                    {pending ? "Saving…" : existing ? "Save" : "Create"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push("/admin/taxonomy")}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
