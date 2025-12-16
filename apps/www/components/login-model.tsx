"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { LogIn, UserPlus } from "lucide-react"

interface LoginDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    translations: {
        title: string
        description: string
        signIn: string
        signUp: string
        or: string
    }
}

export function LoginModel({ open, onOpenChange, translations: t }: LoginDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif font-light text-center">
                        {t.title}
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        {t.description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-col gap-3 pt-4">
                    <SignInButton mode="modal">
                        <Button
                            className="w-full h-12 text-base uppercase tracking-[0.2em]"
                            size="lg"
                        >
                            <LogIn className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                            {t.signIn}
                        </Button>
                    </SignInButton>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                {t.or}
                            </span>
                        </div>
                    </div>
                    <SignUpButton mode="modal">
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base uppercase tracking-[0.2em]"
                            size="lg"
                        >
                            <UserPlus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                            {t.signUp}
                        </Button>
                    </SignUpButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}