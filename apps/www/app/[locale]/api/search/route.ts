import { resolveLocale } from "@repo/database"
import { SearchService } from "@/lib/services/search-service"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    try {
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
