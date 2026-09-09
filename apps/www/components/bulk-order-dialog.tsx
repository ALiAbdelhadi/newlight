"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"
import { Boxes, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type ContactFormData, getContactSchema } from "@/lib/validation/contact"

type Field = keyof ContactFormData

export function BulkOrderDialog({ sku, productName, quantity }: { sku: string; productName: string; quantity: number }) {
    const t = useTranslations("product-page")
    const tb = useTranslations("bulkOrder")
    const locale = useLocale()
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ContactFormData>({
        resolver: zodResolver(getContactSchema(locale)),
        defaultValues: { fullName: "", jobPosition: "", email: "", phoneNumber: "" },
    })

    const onSubmit = async (data: ContactFormData) => {
        try {
            const response = await fetch(`/${locale}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    message: tb("message", { product: productName, sku, quantity }),
                }),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || "Failed to submit")

            toast.success(tb("sent"), { description: tb("sentBody") })
            reset()
            setOpen(false)
        } catch (error) {
            toast.error(tb("failed"), {
                description: error instanceof Error ? error.message : tb("failedBody"),
            })
        }
    }

    const fields: Array<{ name: Field; type: string; dir?: "ltr"; autoComplete: string }> = [
        { name: "fullName", type: "text", autoComplete: "name" },
        { name: "jobPosition", type: "text", autoComplete: "organization-title" },
        { name: "email", type: "email", dir: "ltr", autoComplete: "email" },
        { name: "phoneNumber", type: "tel", dir: "ltr", autoComplete: "tel" },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="flex w-full items-start gap-3 rounded-lg border bg-surface-sunk p-4 text-start transition-colors duration-(--duration-fast) hover:border-border-strong hover:bg-accent"
                >
                    <Boxes aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0 text-sm">
                        <span className="block font-medium">{t("bulkOrderTitle")}</span>
                        <span className="block text-muted-foreground">{t("bulkOrderDescription")}</span>
                    </span>
                </button>
            </DialogTrigger>

            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("bulkOrderTitle")}</DialogTitle>
                    <DialogDescription>{tb("about", { product: productName, quantity })}</DialogDescription>
                </DialogHeader>

                <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {fields.map((field) => {
                            const id = `bulk-${field.name}`
                            const error = errors[field.name]?.message
                            return (
                                <div key={field.name} className="space-y-1.5">
                                    <Label htmlFor={id}>{tb(field.name)}</Label>
                                    <Input
                                        id={id}
                                        type={field.type}
                                        dir={field.dir}
                                        autoComplete={field.autoComplete}
                                        aria-invalid={error ? true : undefined}
                                        aria-describedby={error ? `${id}-error` : undefined}
                                        className={cn(error && "border-danger")}
                                        {...register(field.name)}
                                    />
                                    {error && (
                                        <p id={`${id}-error`} className="text-xs text-danger">
                                            {error}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        <Send aria-hidden />
                        {isSubmitting ? tb("sending") : t("contactSalesTeam")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
