"use client"

import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function SearchSheet() {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [open])

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            setSearchQuery("")
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <button className="group rounded-lg p-2 transition-all duration-200 hover:bg-secondary">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Search</span>
                </button>
            </SheetTrigger>
            <SheetContent
                side="top"
                className="w-full bg-background border-b border-border h-screen data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            >
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                        <div className="flex items-baseline gap-1">
                            <h1 className="text-2xl font-extrabold tracking-tighter uppercase text-foreground">
                                new
                            </h1>
                            <p className="text-2xl font-light tracking-widest uppercase text-foreground">
                                light
                            </p>
                        </div>
                        <SheetClose asChild>
                            <button className="rounded-lg p-2 transition-all duration-200 hover:bg-secondary">
                                <X className="h-6 w-6 text-foreground" />
                                <span className="sr-only">Close</span>
                            </button>
                        </SheetClose>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-background">
                        <div className="container mx-auto max-w-3xl px-8 py-12">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search products, categories, or lighting solutions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 text-lg bg-muted/50 border-border focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="mt-8 space-y-6">
                                {searchQuery ? (
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                                            Search Results
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">
                                                Searching for &quot;{searchQuery}&quot;...
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                                            Popular Searches
                                        </h3>
                                        <div className="space-y-2">
                                            {['Residential Lighting', 'Commercial Solutions', 'Outdoor Lighting', 'Smart Lighting'].map((item) => (
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
                            The New Thesaurus: A Guide to Residential Lighting Solutions
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}