import { searchContent } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get("q") || ""
        const limit = parseInt(searchParams.get("limit") || "20", 10)

        if (!query.trim()) {
            return NextResponse.json({
                products: [],
                categories: [],
                subCategories: [],
            })
        }

        // Always use English locale for search
        const results = await searchContent(query, "en", limit)

        return NextResponse.json(results)
    } catch (error) {
        console.error("Search error:", error)
        return NextResponse.json(
            { error: "Failed to perform search" },
            { status: 500 }
        )
    }
}

