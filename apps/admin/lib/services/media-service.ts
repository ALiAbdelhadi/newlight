import { createHash } from "node:crypto"
import { prisma } from "@repo/database"
import { requireCurrentAdmin } from "@/lib/auth"
import { revalidateStorefront } from "@/lib/revalidate"

/**
 * Product images — upload, order, colour, delete.
 *
 * The catalog's images live on Cloudinary after the §15 migration, and `ProductImage.publicId`
 * is the identity that ties a row to the file. So everything here works in those terms: an
 * upload mints a public_id, a delete removes the row and can remove the asset, and nothing
 * ever stores a bare local path again.
 *
 * No Cloudinary SDK. The upload API is a signed multipart POST and the destroy API is a signed
 * form POST; adding a dependency to make two HTTP calls would hide the only part of this worth
 * reading — the signature.
 */

export class MediaError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "MediaError"
    }
}

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"])

function credentials() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
        throw new MediaError(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
        )
    }
    return { cloudName, apiKey, apiSecret }
}

/** Cloudinary signs the sorted, ampersand-joined parameters with the API secret appended. */
function sign(params: Record<string, string>, apiSecret: string): string {
    const canonical = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&")
    return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex")
}

/**
 * The public_id an uploaded file gets.
 *
 * Same shape the migration produced — `products/<category>/<sub-category>/<sku>-<n>` — so a
 * migrated image and an admin-uploaded one are indistinguishable afterwards, which is what
 * keeps `media:verify` meaningful.
 */
function publicIdFor(parts: { categorySlug: string; subCategorySlug: string; sku: string; index: number }): string {
    const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
    return `products/${clean(parts.categorySlug)}/${clean(parts.subCategorySlug)}/${clean(parts.sku)}-${parts.index}`
}

export class MediaService {
    static async forProduct(productId: string) {
        await requireCurrentAdmin()
        const [images, colors] = await Promise.all([
            prisma.productImage.findMany({
                where: { productId },
                orderBy: { order: "asc" },
                include: { color: { select: { id: true, key: true, hex: true } } },
            }),
            prisma.productColor.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true, hex: true } }),
        ])
        return { images, colors }
    }

    /**
     * Upload one file and attach it to the product.
     *
     * The row is written only after Cloudinary has accepted the file: a `ProductImage` whose
     * URL 404s is worse than no image at all, because the storefront renders the broken one.
     */
    static async upload(productId: string, file: File, colorId: string | null) {
        const admin = await requireCurrentAdmin()

        if (!ACCEPTED.has(file.type)) {
            throw new MediaError(`${file.type || "that file"} is not an image. Use JPEG, PNG, WebP or AVIF.`)
        }
        if (file.size > MAX_BYTES) {
            throw new MediaError(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`)
        }

        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: {
                productId: true,
                subCategory: {
                    select: {
                        translations: { where: { locale: "en" }, select: { slug: true }, take: 1 },
                        category: { select: { translations: { where: { locale: "en" }, select: { slug: true }, take: 1 } } },
                    },
                },
                images: { select: { order: true }, orderBy: { order: "desc" }, take: 1 },
            },
        })

        const nextOrder = (product.images[0]?.order ?? -1) + 1
        const publicId = publicIdFor({
            categorySlug: product.subCategory.category.translations[0]?.slug ?? "uncategorised",
            subCategorySlug: product.subCategory.translations[0]?.slug ?? "uncategorised",
            sku: product.productId,
            index: nextOrder,
        })

        const { cloudName, apiKey, apiSecret } = credentials()
        const timestamp = String(Math.floor(Date.now() / 1000))
        const params = { public_id: publicId, timestamp, overwrite: "true", invalidate: "true" }

        const form = new FormData()
        form.append("file", file)
        for (const [key, value] of Object.entries(params)) form.append(key, value)
        form.append("api_key", apiKey)
        form.append("signature", sign(params, apiSecret))

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: form,
        })
        if (!response.ok) {
            throw new MediaError(`Cloudinary refused the upload (${response.status}): ${await response.text()}`)
        }

        const result = (await response.json()) as {
            secure_url: string
            public_id: string
            width?: number
            height?: number
        }

        const image = await prisma.$transaction(async (tx) => {
            const created = await tx.productImage.create({
                data: {
                    productId,
                    url: result.secure_url,
                    publicId: result.public_id,
                    order: nextOrder,
                    colorId,
                    width: result.width ?? null,
                    height: result.height ?? null,
                },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.image_upload",
                    entity: "Product",
                    entityId: productId,
                    diff: { sku: product.productId, publicId: result.public_id, order: nextOrder },
                },
            })
            return created
        })

        await revalidateStorefront({ kind: "all" })
        return image
    }

    /**
     * Set the order of every image in one transaction.
     *
     * Order 0 is the image the storefront shows in listings and as the first of the gallery, so
     * "make this the main photo" is this call with that id first — not a separate flag that
     * could disagree with the ordering.
     *
     * The two-pass shuffle exists because `@@index([productId, order])` is not unique but the
     * intermediate states of a reorder would otherwise collide in a way that is confusing to
     * read back mid-transaction; negative offsets keep every step distinct.
     */
    static async reorder(productId: string, orderedIds: string[]) {
        const admin = await requireCurrentAdmin()

        const existing = await prisma.productImage.findMany({
            where: { productId },
            select: { id: true },
        })
        const known = new Set(existing.map((image) => image.id))
        if (orderedIds.length !== known.size || orderedIds.some((id) => !known.has(id))) {
            throw new MediaError("That ordering does not match this product's images. Reload and try again.")
        }

        await prisma.$transaction(async (tx) => {
            for (const [index, id] of orderedIds.entries()) {
                await tx.productImage.update({ where: { id }, data: { order: -1 - index } })
            }
            for (const [index, id] of orderedIds.entries()) {
                await tx.productImage.update({ where: { id }, data: { order: index } })
            }
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.image_reorder",
                    entity: "Product",
                    entityId: productId,
                    diff: { order: orderedIds },
                },
            })
        })

        await revalidateStorefront({ kind: "all" })
    }

    /** Which colour a photo shows, or none. Drives the storefront's colour-linked gallery. */
    static async setColor(imageId: string, colorId: string | null) {
        const admin = await requireCurrentAdmin()
        const image = await prisma.$transaction(async (tx) => {
            const updated = await tx.productImage.update({
                where: { id: imageId },
                data: { colorId },
                select: { id: true, productId: true, publicId: true },
            })
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.image_color",
                    entity: "Product",
                    entityId: updated.productId,
                    diff: { publicId: updated.publicId, colorId },
                },
            })
            return updated
        })
        await revalidateStorefront({ kind: "all" })
        return image
    }

    /** Alt text, per locale. Empty means "not written yet", never an empty string. */
    static async setAlt(imageId: string, altEn: string | null, altAr: string | null) {
        await requireCurrentAdmin()
        await prisma.productImage.update({
            where: { id: imageId },
            data: {
                altEn: altEn?.trim() ? altEn.trim() : null,
                altAr: altAr?.trim() ? altAr.trim() : null,
            },
        })
        await revalidateStorefront({ kind: "all" })
    }

    /**
     * Remove an image.
     *
     * The Cloudinary asset is destroyed too, but ONLY if no other row still points at that
     * public_id — the migration deliberately let several catalog paths share one file, and
     * destroying the asset out from under a sibling row would break a product nobody touched.
     * If the destroy fails the row is still gone; an orphaned asset costs storage, an orphaned
     * row costs a broken page.
     */
    static async remove(imageId: string) {
        const admin = await requireCurrentAdmin()

        const image = await prisma.productImage.findUniqueOrThrow({
            where: { id: imageId },
            select: { id: true, productId: true, publicId: true, order: true },
        })

        const siblings = await prisma.productImage.count({
            where: { publicId: image.publicId, id: { not: imageId } },
        })

        await prisma.$transaction(async (tx) => {
            await tx.productImage.delete({ where: { id: imageId } })
            // Close the gap, so orders stay 0..n-1 and "first" keeps meaning first.
            const rest = await tx.productImage.findMany({
                where: { productId: image.productId },
                orderBy: { order: "asc" },
                select: { id: true },
            })
            for (const [index, row] of rest.entries()) {
                await tx.productImage.update({ where: { id: row.id }, data: { order: index } })
            }
            await tx.adminAuditLog.create({
                data: {
                    actorType: "ADMIN",
                    actorId: admin.id,
                    actorEmail: admin.email,
                    action: "product.image_delete",
                    entity: "Product",
                    entityId: image.productId,
                    diff: { publicId: image.publicId, assetKept: siblings > 0 },
                },
            })
        })

        if (siblings === 0) {
            try {
                const { cloudName, apiKey, apiSecret } = credentials()
                const timestamp = String(Math.floor(Date.now() / 1000))
                // `invalidate` purges the CDN too. Without it Cloudinary deletes the asset and
                // the edge keeps serving it — a removed photo stays visible for as long as the
                // cache lives, which is exactly the window in which someone checks whether the
                // removal worked. Verified: destroy returns ok, and the URL is still 200 from
                // cache without this flag.
                const params = { public_id: image.publicId, timestamp, invalidate: "true" }
                const form = new FormData()
                for (const [key, value] of Object.entries(params)) form.append(key, value)
                form.append("api_key", apiKey)
                form.append("signature", sign(params, apiSecret))
                await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form })
            } catch (error) {
                console.error(`[media] the row is gone but Cloudinary still holds ${image.publicId}:`, error)
            }
        }

        await revalidateStorefront({ kind: "all" })
        return { removed: image.publicId, assetKept: siblings > 0 }
    }
}
