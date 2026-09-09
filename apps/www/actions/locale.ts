"use server"

import type { Locale } from "@repo/database"

import { localizedPathFor as resolveLocalizedPath } from "@/lib/services/localized-path"

export async function localizedPathFor(pathname: string, targetLocale: Locale): Promise<string> {
    return resolveLocalizedPath(pathname, targetLocale)
}
