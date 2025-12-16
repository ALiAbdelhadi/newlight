"use client"

import { createOrderFromConfiguration, saveShippingAddress } from "@/actions/order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "@/i18n/navigation"
import { getShippingSchema, type ShippingAddressFormData } from "@/lib/validation/shipping"
import { zodResolver } from "@hookform/resolvers/zod"
import { Home, Loader2, Mail, MapPin, Phone, User } from "lucide-react"
import { useLocale } from "next-intl"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

interface ConfirmFormProps {
    configId: string
    userId: string
    existingAddress?: {
        fullName: string
        phone: string
        email?: string
        addressLine1: string
        addressLine2?: string
        city: string
        state?: string
        postalCode: string
        country: string
    }
    translations: {
        shippingInformation: string
        fullName: string
        phone: string
        email: string
        addressLine1: string
        addressLine2: string
        city: string
        state: string
        postalCode: string
        shippingOption: string
        basicShipping: string
        standardShipping: string
        expressShipping: string
        saveAndContinue: string
        fullNamePlaceholder: string
        phonePlaceholder: string
        emailPlaceholder: string
        addressPlaceholder: string
        cityPlaceholder: string
        statePlaceholder: string
        postalCodePlaceholder: string
    }
    isArabic: boolean
}

export function ConfirmForm({
    configId,
    userId,
    existingAddress,
    translations: t,
    isArabic
}: ConfirmFormProps) {
    const router = useRouter()
    const locale = useLocale()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [shippingOption, setShippingOption] = useState<"BasicShipping" | "StandardShipping" | "ExpressShipping">("StandardShipping")

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ShippingAddressFormData>({
        resolver: zodResolver(getShippingSchema(locale)),
        defaultValues: {
            fullName: existingAddress?.fullName || "",
            phone: existingAddress?.phone || "",
            email: existingAddress?.email || "",
            addressLine1: existingAddress?.addressLine1 || "",
            addressLine2: existingAddress?.addressLine2 || "",
            city: existingAddress?.city || "",
            state: existingAddress?.state || "",
            postalCode: existingAddress?.postalCode || "",
        }
    })

    const onSubmit = async (data: ShippingAddressFormData) => {
        setError(null)

        startTransition(async () => {

            const addressResult = await saveShippingAddress(userId, data)

            if (!addressResult.success) {
                setError(addressResult.error || "Failed to save address")
                return
            }

            const orderResult = await createOrderFromConfiguration(configId, shippingOption)

            if (!orderResult.success) {
                setError(orderResult.error || "Failed to create order")
                return
            }
            router.push(`/complete/configId=${configId}?orderId=${orderResult.order?.id}`)
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-secondary/30 rounded-lg p-6 border border-border space-y-6">
                <h2 className="text-2xl font-serif font-light flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {t.shippingInformation}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {t.fullName}
                        </Label>
                        <Input
                            id="fullName"
                            {...register("fullName")}
                            placeholder={t.fullNamePlaceholder}
                            className={`h-12 ${errors.fullName ? "border-destructive" : ""}`}
                        />
                        {errors.fullName && (
                            <p className="text-sm text-destructive">{errors.fullName.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {t.phone}
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            {...register("phone")}
                            placeholder={t.phonePlaceholder}
                            className={`h-12 ${errors.phone ? "border-destructive" : ""}`}
                        />
                        {errors.phone && (
                            <p className="text-sm text-destructive">{errors.phone.message}</p>
                        )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {t.email}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            {...register("email")}
                            placeholder={t.emailPlaceholder}
                            className={`h-12 ${errors.email ? "border-destructive" : ""}`}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="addressLine1" className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            {t.addressLine1}
                        </Label>
                        <Input
                            id="addressLine1"
                            {...register("addressLine1")}
                            placeholder={t.addressPlaceholder}
                            className={`h-12 ${errors.addressLine1 ? "border-destructive" : ""}`}
                        />
                        {errors.addressLine1 && (
                            <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
                        )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="addressLine2">
                            {t.addressLine2} <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Input
                            id="addressLine2"
                            {...register("addressLine2")}
                            className={`h-12 ${errors.addressLine2 ? "border-destructive" : ""}`}
                        />
                        {errors.addressLine2 && (
                            <p className="text-sm text-destructive">{errors.addressLine2.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">{t.city}</Label>
                        <Input
                            id="city"
                            {...register("city")}
                            placeholder={t.cityPlaceholder}
                            className={`h-12 ${errors.city ? "border-destructive" : ""}`}
                        />
                        {errors.city && (
                            <p className="text-sm text-destructive">{errors.city.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state">{t.state}</Label>
                        <Input
                            id="state"
                            {...register("state")}
                            placeholder={t.statePlaceholder}
                            className={`h-12 ${errors.state ? "border-destructive" : ""}`}
                        />
                        {errors.state && (
                            <p className="text-sm text-destructive">{errors.state.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postalCode">{t.postalCode}</Label>
                        <Input
                            id="postalCode"
                            {...register("postalCode")}
                            placeholder={t.postalCodePlaceholder}
                            className={`h-12 ${errors.postalCode ? "border-destructive" : ""}`}
                        />
                        {errors.postalCode && (
                            <p className="text-sm text-destructive">{errors.postalCode.message}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-6 border border-border space-y-4">
                <h2 className="text-2xl font-serif font-light">
                    {t.shippingOption}
                </h2>
                <RadioGroup
                    value={shippingOption}
                    onValueChange={(value: "BasicShipping" | "StandardShipping" | "ExpressShipping") => setShippingOption(value)}
                >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                        <RadioGroupItem value="BasicShipping" id="basic" />
                        <Label htmlFor="basic" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span>{t.basicShipping}</span>
                                <span className="text-muted-foreground">50 {isArabic ? "ج.م" : "EGP"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isArabic ? "التوصيل خلال 7-10 أيام عمل" : "Delivery in 7-10 business days"}
                            </p>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                        <RadioGroupItem value="StandardShipping" id="standard" />
                        <Label htmlFor="standard" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span>{t.standardShipping}</span>
                                <span className="text-muted-foreground">100 {isArabic ? "ج.م" : "EGP"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isArabic ? "التوصيل خلال 3-5 أيام عمل" : "Delivery in 3-5 business days"}
                            </p>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                        <RadioGroupItem value="ExpressShipping" id="express" />
                        <Label htmlFor="express" className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                                <span>{t.expressShipping}</span>
                                <span className="text-muted-foreground">200 {isArabic ? "ج.م" : "EGP"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isArabic ? "التوصيل خلال 1-2 يوم عمل" : "Delivery in 1-2 business days"}
                            </p>
                        </Label>
                    </div>
                </RadioGroup>
            </div>
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4">
                    {error}
                </div>
            )}
            <Button
                type="submit"
                disabled={isPending}
                className="w-full h-14 text-base uppercase tracking-[0.2em]"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 ltr:mr-2 rtl:ml-2 animate-spin" />
                        {isArabic ? "جاري المعالجة..." : "Processing..."}
                    </>
                ) : (
                    t.saveAndContinue
                )}
            </Button>
        </form>
    )
}