"use client"

import type { ImageLoaderProps } from "next/image"

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
    if (!src.includes("res.cloudinary.com")) return src

    const [prefix, suffix] = src.split("/upload/")
    if (!prefix || !suffix) return src

    const transformations = [
        "f_auto",
        `q_${quality ?? "auto"}`,
        `w_${width}`,
        "c_limit",
    ].join(",")

    return `${prefix}/upload/${transformations}/${suffix}`
}
