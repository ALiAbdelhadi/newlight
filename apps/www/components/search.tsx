"use client"

import { searchProducts } from "@/actions/search"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search, X, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { useDebounce } from "use-debounce"
import { useTranslations } from "next-intl"

interface Product {
    id: string
    productId: string
    slug: string
    price: number
    images: string[]
    name: string
    description?: string | null
    categoryName?: string
    categorySlug?: string
    subCategoryName?: string
    subCategorySlug?: string
}

export function SearchSheet() {
    const t = useTranslations('search')
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchTerm] = useDebounce(searchQuery, 300)
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [open])

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearchTerm.trim() === "") {
                setFilteredProducts([])
                return
            }

            setIsSearching(true)
            try {
                const results = await searchProducts(debouncedSearchTerm)
                setFilteredProducts(results)
            } catch (error) {
                console.error("Error searching products:", error)
                setFilteredProducts([])
            } finally {
                setIsSearching(false)
            }
        }

        performSearch()
    }, [debouncedSearchTerm])

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            setSearchQuery("")
            setFilteredProducts([])
            setIsSearching(false)
        }
    }

    const handleResultClick = () => {
        setOpen(false)
        setSearchQuery("")
        setFilteredProducts([])
    }

    const popularSearches = [
        t('suggestions.indoor'),
        t('suggestions.solutions'),
        t('suggestions.outdoor'),
        t('suggestions.smart')
    ]

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <button className="group rounded-lg p-2 transition-all duration-200 hover:bg-secondary">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">{t('button')}</span>
                </button>
            </SheetTrigger>
            <SheetContent
                side="top"
                className="w-full border-b border-border h-screen data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            >
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                        <div className="flex items-baseline gap-1">
                            <h1 className="text-2xl font-extrabold tracking-tighter uppercase text-foreground">
                                {t('brand.new')}
                            </h1>
                            <p className="text-2xl font-light tracking-widest uppercase text-foreground">
                                {t('brand.light')}
                            </p>
                        </div>
                        <SheetClose asChild>
                            <button className="rounded-lg p-2 transition-all duration-200 hover:bg-secondary">
                                <X className="h-6 w-6 text-foreground" />
                                <span className="sr-only">{t('close')}</span>
                            </button>
                        </SheetClose>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="container mx-auto max-w-3xl px-8 py-12">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder={t('placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 text-lg bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="mt-8 space-y-6">
                                {searchQuery ? (
                                    <>
                                        {isSearching ? (
                                            <div className="text-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                                                <p className="text-sm text-muted-foreground">
                                                    {t('searching', { query: searchQuery })}
                                                </p>
                                            </div>
                                        ) : filteredProducts.length > 0 ? (
                                            <div className="space-y-2">
                                                {filteredProducts.map((product) => (
                                                    <Link
                                                        key={product.id}
                                                        href={`/category/${product.categorySlug}/${product.subCategorySlug}/${product.productId}`}
                                                        onClick={handleResultClick}
                                                        className="block group"
                                                    >
                                                        <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                                                            {product.images[0] && (
                                                                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                                                                    <Image
                                                                        src={product.images[0]}
                                                                        alt={product.name}
                                                                        fill
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-foreground group-hover:text-foreground/80 transition-colors truncate">
                                                                    {product.name}
                                                                </p>
                                                                {product.description && (
                                                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                                        {product.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {product.categoryName && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {product.categoryName}
                                                                        </span>
                                                                    )}
                                                                    {product.subCategoryName && (
                                                                        <>
                                                                            <span className="text-xs text-muted-foreground">/</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {product.subCategoryName}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-semibold text-foreground">
                                                                    {t('currency')} {product.price.toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <p className="text-sm text-muted-foreground">
                                                    {t('noResults', { query: searchQuery })}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                                            {t('popularSearches')}
                                        </h3>
                                        <div className="space-y-2">
                                            {popularSearches.map((item) => (
                                                <button
                                                    key={item}
                                                    onClick={() => setSearchQuery(item)}
                                                    className="block w-full text-left px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
                                                >
                                                    {item}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-6 border-t border-border">
                        <p className="text-sm text-muted-foreground font-light">
                            {t('footer')}
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}