'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSwitcherProps } from '@/types'
import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'


const languages = [
    {
        code: 'ar',
        name: 'العربية',
        nativeName: 'العربية',
        flag: 'EG',
        dir: 'rtl'
    },
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        dir: 'ltr'
    }
]

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0]

    const handleLanguageChange = (newLocale: string) => {
        if (newLocale === currentLocale) return

        startTransition(() => {
            const segments = pathname.split('/').filter(Boolean)
            if (segments[0] === currentLocale) {
                segments.shift()
            }

            const newPath = `/${newLocale}/${segments.join('/')}`
            router.push(newPath)
            const newDirection = languages.find(lang => lang.code === newLocale)?.dir || 'ltr'
            document.documentElement.dir = newDirection
            document.documentElement.lang = newLocale
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 gap-2 hover:bg-accent/50 transition-colors font-medium"
                    disabled={isPending}
                >
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline text-sm">
                            {currentLanguage?.nativeName}
                        </span>
                        <span className="text-base leading-none">{currentLanguage?.flag}</span>
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        className={`cursor-pointer flex items-center gap-3 px-3 py-2.5 transition-colors ${currentLocale === language.code
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'hover:bg-accent/50'
                            }`}
                        disabled={currentLocale === language.code || isPending}
                    >
                        <span className="text-lg leading-none">{language.flag}</span>
                        <div className="flex flex-col flex-1">
                            <span className={`text-sm font-medium ${language.code === 'ar' ? 'font-arabic text-right' : 'text-left'
                                }`}>
                                {language.nativeName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {language.name}
                            </span>
                        </div>
                        {currentLocale === language.code && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        {isPending && currentLocale !== language.code && (
                            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}