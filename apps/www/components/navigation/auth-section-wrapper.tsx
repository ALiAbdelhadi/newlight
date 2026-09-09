"use client"

import { Suspense } from "react"

export function AuthSectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-muted animate-pulse rounded-md" />
      </div>
    }>
      {children}
    </Suspense>
  )
}