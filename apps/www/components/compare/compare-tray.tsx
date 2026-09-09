"use client"

import { useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import {
    COMPARE_MAX,
    compareServerSnapshot,
    compareSnapshot,
    subscribeCompare,
    writeCompare,
} from "@/lib/compare-store"

export function CompareTray() {
    const t = useTranslations("compare")
    const serialised = useSyncExternalStore(subscribeCompare, compareSnapshot, compareServerSnapshot)
    const skus = JSON.parse(serialised) as string[]

    if (skus.length === 0) return null

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
            <div className="pointer-events-auto mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-overlay sm:p-4">
                <p className="text-sm">
                    <span className="font-medium tabular-nums">{t("selected", { count: skus.length, max: COMPARE_MAX })}</span>
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => writeCompare([])}>
                        <X aria-hidden />
                        {t("clear")}
                    </Button>
                    <Button asChild size="sm" disabled={skus.length < 2} className="group">
                        {skus.length < 2 ? (
                            <span aria-disabled className="opacity-50">
                                {t("needMore")}
                            </span>
                        ) : (
                            <Link href="/compare">
                                {t("open")}
                                <DirectionalArrow />
                            </Link>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
