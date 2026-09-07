"use client"

import type { ImageLoaderProps } from "next/image"

/**
 * A Cloudinary loader for next/image — ADR 0002.
 *
 * Cloudinary already transforms and CDN-serves every image. Routing those URLs through
 * Vercel's optimizer pays for the same work twice: once at upload, once per unique size, on
 * a plan that bills for it.
 *
 * The trade-off, stated because it is real: this gives up Vercel's automatic format
 * negotiation and its own cache, and couples the app to Cloudinary's URL grammar. `f_auto`
 * covers the format half — Cloudinary negotiates AVIF/WebP from the Accept header itself.
 *
 * Non-Cloudinary sources pass through untouched, so a local /placeholder.svg still works.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
    if (!src.includes("res.cloudinary.com")) return src

    // A delivery URL looks like https://res.cloudinary.com/<cloud>/image/upload/<public_id>.
    // Transformations go in the segment straight after `upload`.
    const [prefix, suffix] = src.split("/upload/")
    if (!prefix || !suffix) return src

    const transformations = [
        "f_auto", // let Cloudinary pick AVIF/WebP per request
        `q_${quality ?? "auto"}`,
        `w_${width}`,
        "c_limit", // never upscale past the original
    ].join(",")

    return `${prefix}/upload/${transformations}/${suffix}`
}
