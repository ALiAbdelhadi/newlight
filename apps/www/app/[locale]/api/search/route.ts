import { resolveLocale } from "@repo/database"
import { SearchService } from "@/lib/services/search-service"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    try {
        // The route lives under app/[locale]. v1 ignored that and passed "en" with the comment
        // "Always use English locale for search", so an Arabic reader searching Arabic terms
        // matched nothing at all.
        const { locale } = await params
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get("q") || ""
        const limit = parseInt(searchParams.get("limit") || "20", 10)

        if (!query.trim()) {
            return NextResponse.json({ products: [], categories: [], subCategories: [] })
        }

        const results = await SearchService.searchContent(query, resolveLocale(locale), limit)
        return NextResponse.json(results)
    } catch (error) {
        console.error("Search error:", error)
        return NextResponse.json({ error: "Failed to perform search" }, { status: 500 })
    }
}
