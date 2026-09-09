"use client"

import NextImage, { type ImageProps } from "next/image"

import cloudinaryLoader from "@/lib/cloudinary-loader"

/**
 * `next/image` with the loader chosen per source — ADR 0002, mirroring apps/www.
 *
 * Every image the admin renders comes from the catalog and is already on Cloudinary, so it
 * has no business going through Vercel's optimizer a second time. It is still a per-source
 * choice rather than a `loader` in next.config, because configuring one there disables
 * /_next/image outright — and the favicons and hero in /public would lose it too.
 */
export default function AppImage({ src, ...rest }: ImageProps) {
    const onCloudinary = typeof src === "string" && src.includes("res.cloudinary.com")
    return <NextImage src={src} {...(onCloudinary ? { loader: cloudinaryLoader } : {})} {...rest} />
}
