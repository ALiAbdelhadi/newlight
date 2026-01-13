import { Contact, Home, Package, ShoppingCart, Truck, Users } from "lucide-react"
import type React from "react"

export interface DashboardItem {
    name: string
    icon: React.ReactNode
    url: string
    badge?: string | number
}

export const DASHBOARDS: DashboardItem[] = [
    {
        name: "Dashboard",
        icon: <Home className="h-5 w-5" />,
        url: "/admin/dashboard",
    },
    {
        name: "Orders",
        icon: <ShoppingCart className="h-5 w-5" />,
        url: "/admin/orders",
        badge: "12",
    },
    {
        name: "Products",
        icon: <Package className="h-5 w-5" />,
        url: "/admin/products",
    },
    {
        name: "Customers",
        icon: <Users className="h-5 w-5" />,
        url: "/admin/customers",
    },
    {
        name: "Shipping",
        icon: <Truck className="h-5 w-5" />,
        url: "/admin/shipping",
    },
    {
        name: "Contact",
        icon: <Contact className="h-5 w-5" />,
        url: "/admin/contact",
    }
]
