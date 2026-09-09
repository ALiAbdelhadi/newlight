import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { LOCALES } from "@repo/database"

export const dynamic = "force-dynamic"

type Target =
    | { kind: "product"; slug: string; categorySlug?: string; subCategorySlug?: string }
    | { kind: "category" }
    | { kind: "subCategory" }
    | { kind: "all" }

export async function POST(request: NextRequest) {
    const secret = process.env.STOREFRONT_REVALIDATION_SECRET
    if (!secret) {
        console.error("[revalidate] STOREFRONT_REVALIDATION_SECRET is not set; refusing to run unauthenticated.")
        return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    const header = request.headers.get("authorization")
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : null
    if (provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    let target: Target
    try {
        target = (await request.json()) as Target
    } catch {
        return NextResponse.json({ error: "invalid body" }, { status: 400 })
    }

    const revalidated: string[] = []

    switch (target.kind) {
        case "product": {
            revalidateTag(`product:${target.slug}`, "max")
            revalidated.push(`tag product:${target.slug}`)
            for (const locale of LOCALES) {
                if (target.categorySlug && target.subCategorySlug) {
                    const path = `/${locale}/category/${target.categorySlug}/${target.subCategorySlug}/${target.slug}`
                    revalidatePath(path)
                    revalidated.push(path)
                }
            }
            break
        }
        case "category":
        case "subCategory": {
            revalidateTag("taxonomy", "max")
            revalidated.push("tag taxonomy")
            for (const locale of LOCALES) {
                revalidatePath(`/${locale}/category`, "layout")
                revalidated.push(`/${locale}/category (layout)`)
            }
            break
        }
        case "all": {
            for (const locale of LOCALES) {
                revalidatePath(`/${locale}`, "layout")
                revalidated.push(`/${locale} (layout)`)
            }
            break
        }
        default:
            return NextResponse.json({ error: "unknown target kind" }, { status: 400 })
    }

    return NextResponse.json({ revalidated, at: new Date().toISOString() })
}
