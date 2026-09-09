"use client"

import { DirectionalArrow } from "@/components/directional-arrow"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { usePathname, useRouter } from 'next/navigation'
import { Globe, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

type LanguageCode = "en" | "ar"

interface Language {
    code: LanguageCode
    name: string
    nativeName: string
    region: string
    dir: "ltr" | "rtl"
}

export function LanguageSelector() {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useLocale() as LanguageCode
    const [isPending, startTransition] = useTransition()
    const t = useTranslations('language-selector')
    const tLogo = useTranslations('nav')

    const LANGUAGES: Language[] = [
        {
            code: "en",
            name: t('languages.en.name'),
            nativeName: t('languages.en.nativeName'),
            region: t('languages.en.region'),
            dir: "ltr" as const
        },
        {
            code: "ar",
            name: t('languages.ar.name'),
            nativeName: t('languages.ar.nativeName'),
            region: t('languages.ar.region'),
            dir: "rtl" as const
        }
    ]

    const currentLanguage = LANGUAGES.find(lang => lang.code === currentLocale) || LANGUAGES[0]

    const handleLanguageSelect = (languageCode: LanguageCode) => {
        if (languageCode === currentLocale) {
            setOpen(false)
            return
        }

        startTransition(() => {
            const segments = pathname.split('/').filter(Boolean)
            if (segments[0] === currentLocale) {
                segments.shift()
            }

            const newPath = segments.length > 0
                ? `/${languageCode}/${segments.join('/')}`
                : `/${languageCode}`

            const newLanguage = LANGUAGES.find(lang => lang.code === languageCode)
            if (newLanguage) {
                document.documentElement.dir = newLanguage.dir
                document.documentElement.lang = languageCode
            }

            router.push(newPath)
            setOpen(false)
        })
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    className="group flex flex-col items-end hover:opacity-80 transition-opacity md:h-auto md:p-0 h-9 px-3 py-2 has-[>svg]:px-3"
                    disabled={isPending}
                >
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline text-sm text-foreground">
                            {t('international')}
                        </span>
                        <Globe className="md:h-4 md:w-4 h-5 w-5 text-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {currentLanguage.code.toUpperCase()}
                    </span>
                </button>
            </SheetTrigger>
            <SheetContent
                side="top"
                className="p-0 w-full border-b border-border h-screen data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            >
                {/* Radix logs an accessibility error for a dialog with no title, and a screen
                    reader announces "dialog" and nothing else. */}
                <SheetTitle className="sr-only">{t('title')}</SheetTitle>
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold tracking-tight uppercase">
                                {tLogo('logoNew')}
                            </span>
                            <span className="text-xl font-light tracking-wordmark uppercase">
                                {tLogo('logoLight')}
                            </span>
                        </div>
                        <SheetClose asChild>
                            <button className="rounded-lg p-2 transition-all duration-200 hover:bg-secondary">
                                <X className="h-6 w-6 text-foreground" />
                                <span className="sr-only">{t('close')}</span>
                            </button>
                        </SheetClose>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="py-8 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                                <div>
                                    <h2 className="text-3xl font-light mb-8 tracking-wide text-foreground">
                                        {t('international')}
                                    </h2>
                                    <div className="space-y-4">
                                        {LANGUAGES.map((language) => (
                                            <button
                                                key={language.code}
                                                onClick={() => handleLanguageSelect(language.code)}
                                                disabled={isPending || language.code === currentLanguage.code}
                                                className={`group flex items-center gap-3 text-left transition-all duration-200 hover:translate-x-2 ${language.code === currentLanguage.code
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {/*
                                                  * Two literal "→" characters lived here — a
                                                  * glyph from whatever font happened to resolve,
                                                  * at whatever weight, rotated by hand for RTL.
                                                  * The canonical arrow instead: one shape, one
                                                  * stroke, mirrored by the primitive.
                                                  */}
                                                <DirectionalArrow
                                                    className={
                                                        language.code === currentLanguage.code
                                                            ? "text-foreground"
                                                            : "opacity-0 transition-opacity group-hover:opacity-100"
                                                    }
                                                />
                                                <span className="text-base font-light">{language.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-8 py-6 border-t border-border">
                        <p className="text-sm text-muted-foreground font-light">
                            {isPending ? t('pending') : t('footerText')}
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}