"use client"

import { getDashboardStats } from "@/app/action/dashboard-actions"
import { useEffect, useState } from "react"

interface DashboardStats {
    orders: number
    shipping: number
    notifications: number
    reviews: number
    products: number
    customers: number
}

export function useDashboardStats(initialStats: DashboardStats, refreshInterval = 60000) {
    const [stats, setStats] = useState<DashboardStats>(initialStats)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const refreshStats = async () => {
        setIsRefreshing(true)
        try {
            const newStats = await getDashboardStats()
            setStats(newStats)
        } catch (error) {
            console.error("Failed to refresh stats:", error)
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        // Auto-refresh every X milliseconds
        const interval = setInterval(refreshStats, refreshInterval)

        return () => clearInterval(interval)
    }, [refreshInterval])

    return { stats, isRefreshing, refreshStats }
}