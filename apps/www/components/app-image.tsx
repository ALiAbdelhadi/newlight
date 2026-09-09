"use client"

import NextImage, { type ImageProps } from "next/image"

import cloudinaryLoader from "@/lib/cloudinary-loader"

export default function AppImage({ src, ...rest }: ImageProps) {
    const onCloudinary = typeof src === "string" && src.includes("res.cloudinary.com")
    return <NextImage src={src} {...(onCloudinary ? { loader: cloudinaryLoader } : {})} {...rest} />
}
