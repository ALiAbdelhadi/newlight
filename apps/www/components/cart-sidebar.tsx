"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CartItem } from "@/types"
import { useAuth } from "@clerk/nextjs"
import { Loader2, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function CartSidebar() {
    const { isSignedIn, userId } = useAuth()
    const t = useTranslations("cart")
    const [isOpen, setIsOpen] = useState(false)
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    useEffect(() => {
        const fetchCartItems = async () => {
            if (!isSignedIn || !userId) return
            setIsLoading(true)
            try {
                const response = await fetch("/api/cart")
                if (response.ok) {
                    const items = await response.json()
                    setCartItems(items)
                } else {
                    const errorData = await response.json()
                    console.error("Failed to fetch cart items:", errorData)
                    toast.error(t("messages.failedToLoad"))
                }
            } catch (error) {
                console.error("Error fetching cart items:", error)
                toast.error(t("messages.errorLoading"))
            } finally {
                setIsLoading(false)
            }
        }

        if (isOpen && isSignedIn) {
            fetchCartItems()
        }
    }, [isOpen, isSignedIn, userId, t])

    const updateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return

        const previousItems = [...cartItems]
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        quantity: newQuantity,
                        totalPrice: item.price * newQuantity * (1 - item.discount / 100),
                    }
                    : item,
            ),
        )

        setIsUpdating(itemId)
        try {
            const response = await fetch("/api/cart", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, quantity: newQuantity }),
            })

            if (response.ok) {
                const updatedItem = await response.json()
                setCartItems((prevItems) => prevItems.map((item) => (item.id === itemId ? updatedItem : item)))
                localStorage.setItem(`quantity-${itemId}`, newQuantity.toString())
                toast.success(t("messages.quantityUpdated"))
            } else {
                setCartItems(previousItems)
                toast.error(t("messages.failedToUpdate"))
            }
        } catch {
            setCartItems(previousItems)
            toast.error(t("messages.failedToUpdate"))
        } finally {
            setIsUpdating(null)
        }
    }

    const removeItem = async (itemId: string) => {
        const previousItems = [...cartItems]
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId))

        setIsUpdating(itemId)
        try {
            const response = await fetch("/api/cart", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            })

            if (response.ok) {
                localStorage.removeItem(`quantity-${itemId}`)
                toast.success(t("messages.itemRemoved"))
            } else {
                setCartItems(previousItems)
                toast.error(t("messages.failedToRemove"))
            }
        } catch {
            setCartItems(previousItems)
            toast.error(t("messages.failedToRemove"))
        } finally {
            setIsUpdating(null)
        }
    }

    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative h-9 w-9 border-border/30 hover:border-border hover:bg-accent/5 transition-all bg-transparent"
                    aria-label={t("actions.openCart")}
                >
                    <ShoppingCart className="h-4 w-4" />
                    {totalItems > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-semibold"
                        >
                            {totalItems > 99 ? "99+" : totalItems}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader className="border-b border-border/50 pb-2">
                    <SheetTitle className="flex items-center gap-3 text-lg font-semibold">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        <span>{t("title")}</span>
                        {totalItems > 0 && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                                {totalItems}
                            </Badge>
                        )}
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden flex flex-col">
                    {!isSignedIn ? (
                        <EmptyState
                            icon={ShoppingCart}
                            title={t("signInRequired.title")}
                            description={t("signInRequired.description")}
                        />
                    ) : isLoading ? (
                        <LoadingState />
                    ) : cartItems.length === 0 ? (
                        <EmptyState icon={ShoppingCart} title={t("emptyCart.title")} description={t("emptyCart.description")} />
                    ) : (
                        <CartItemsList
                            items={cartItems}
                            isUpdating={isUpdating}
                            onUpdateQuantity={updateQuantity}
                            onRemoveItem={removeItem}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: any
    title: string
    description: string
}) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    )
}

function LoadingState() {
    const t = useTranslations("cart")
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("loading")}</p>
            </div>
        </div>
    )
}

function CartItemsList({
    items,
    isUpdating,
    onUpdateQuantity,
    onRemoveItem,
}: {
    items: CartItem[]
    isUpdating: string | null
    onUpdateQuantity: (id: string, quantity: number) => Promise<void>
    onRemoveItem: (id: string) => Promise<void>
}) {
    return (
        <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
                {items.map((item) => (
                    <CartItemCard
                        key={item.id}
                        item={item}
                        isUpdating={isUpdating === item.id}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemoveItem={onRemoveItem}
                    />
                ))}
            </div>
        </div>
    )
}

function CartItemCard({
    item,
    isUpdating,
    onUpdateQuantity,
    onRemoveItem,
}: {
    item: CartItem
    isUpdating: boolean
    onUpdateQuantity: (id: string, quantity: number) => Promise<void>
    onRemoveItem: (id: string) => Promise<void>
}) {
    return (
        <div className="group relative bg-card border border-border/50 rounded-lg p-3 hover:border-border/80 hover:shadow-sm transition-all duration-200">
            <div className="flex gap-3">
                {/* Product Image */}
                {item.productImages?.[0] && (
                    <div className="relative shrink-0 w-16 h-16">
                        <Image
                            src={item.productImages[0] || "/placeholder.svg"}
                            alt={item.productName}
                            fill
                            className="object-cover rounded-md"
                        />
                        {item.discount > 0 && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5">
                                -{Math.round(item.discount * 100)}%
                            </Badge>
                        )}
                    </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2">{item.productName}</h4>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => onRemoveItem(item.id)}
                                disabled={isUpdating}
                            >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {item.brand} • {item.spotlightType}
                        </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                        {/* <div className="space-y-0.5">
                            <DiscountPrice price={item.price} quantity={item.quantity} discount={item.discount} />
                            {item.discount > 0 && (
                                <NormalPrice price={item.price} quantity={item.quantity} className="text-xs text-muted-foreground line-through" />
                            )}
                        </div> */}
                        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={isUpdating || item.quantity <= 1}
                            >
                                −
                            </Button>
                            <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={isUpdating}
                            >
                                +
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
