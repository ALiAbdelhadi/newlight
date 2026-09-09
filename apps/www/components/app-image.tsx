"use client"

import NextImage, { type ImageProps } from "next/image"

import cloudinaryLoader from "@/lib/cloudinary-loader"

/**
 * `next/image` with the loader chosen per source — ADR 0002.
 *
 * The ADR asks for a Cloudinary loader so the catalog is not transformed twice, once at
 * upload and again by Vercel. Configuring that loader in `next.config` is global, and it
 * also disables `/_next/image` outright: every asset in /public would then be served at
 * full size, and /hero/hero.jpg alone is 3 MB. Choosing per source is what lets both halves
 * be true, so every image in the app renders through this component rather than importing
 * `next/image` directly.
 */
export default function AppImage({ src, ...rest }: ImageProps) {
    const onCloudinary = typeof src === "string" && src.includes("res.cloudinary.com")
    return <NextImage src={src} {...(onCloudinary ? { loader: cloudinaryLoader } : {})} {...rest} />
}
