"use client"

import { createOrderFromConfiguration, saveShippingAddress } from "@/actions/order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "@/i18n/navigation"
import { generateSessionKey } from "@/lib/idempotency"
import { getShippingSchema, type ShippingAddressFormData } from "@/lib/validation/shipping"
import { ConfirmFormProps, ShippingOption } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import {
    AlertCircle,
    Home,
    Loader2,
    Mail,
    MapPin,
    Package,
    Phone,
    ShoppingBag,
    Truck,
    User,
    Zap
} from "lucide-react"
import { useLocale } from "next-intl"
import { useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

const SHIPPING_OPTIONS = {
    BasicShipping: {
        price: 50,
        daysMin: 7,
        daysMax: 10,
        icon: Package
    },
    StandardShipping: {
        price: 100,
        daysMin: 3,
        daysMax: 5,
        icon: Truck
    },
    ExpressShipping: {
        price: 200,
        daysMin: 1,
        daysMax: 2,
        icon: Zap
    }
} as const

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
    const [shippingOption, setShippingOption] = useState<ShippingOption>("StandardShipping")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const submitAttemptRef = useRef(0)
    const lastSubmitTimeRef = useRef<number>(0)
    const abortControllerRef = useRef<AbortController | null>(null)
    const idempotencyKeyRef = useRef<string>(
        generateSessionKey(userId, configId)
    )

    const {
        register,
        handleSubmit,
        formState: { errors, isValid, dirtyFields },
    } = useForm<ShippingAddressFormData>({
        resolver: zodResolver(getShippingSchema(locale)),
        mode: "onChange",
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

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    useEffect(() => {
        if (isSubmitting) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault()
                e.returnValue = isArabic
                    ? "الطلب قيد المعالجة. هل تريد المغادرة؟"
                    : "Order is being processed. Are you sure you want to leave?"
            }

            window.addEventListener('beforeunload', handleBeforeUnload)
            return () => window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isSubmitting, isArabic])

    const onSubmit = async (data: ShippingAddressFormData) => {
        const now = Date.now()
        const timeSinceLastSubmit = now - lastSubmitTimeRef.current

        if (timeSinceLastSubmit < 2000) {
            toast.error(
                isArabic ? "يرجى الانتظار قبل المحاولة مرة أخرى" : "Please wait before trying again",
                {
                    description: isArabic
                        ? "يمكنك المحاولة بعد ثانيتين"
                        : "You can try again in a moment"
                }
            )
            return
        }

        if (isSubmitting) {
            toast.warning(
                isArabic ? "الطلب قيد المعالجة" : "Order is being processed",
                {
                    description: isArabic
                        ? "يرجى الانتظار..."
                        : "Please wait..."
                }
            )
            return
        }

        submitAttemptRef.current += 1

        if (submitAttemptRef.current > 3) {
            toast.error(
                isArabic ? "تم تجاوز الحد الأقصى للمحاولات" : "Maximum attempts exceeded",
                {
                    description: isArabic
                        ? "يرجى تحديث الصفحة والمحاولة مرة أخرى"
                        : "Please refresh the page and try again"
                }
            )
            return
        }

        lastSubmitTimeRef.current = now
        setIsSubmitting(true)
        abortControllerRef.current = new AbortController()

        startTransition(async () => {
            try {
                const addressPromise = saveShippingAddress(userId, data)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )

                const addressResult = await Promise.race([
                    addressPromise,
                    timeoutPromise
                ]) as Awaited<ReturnType<typeof saveShippingAddress>>

                if (!addressResult.success) {
                    setIsSubmitting(false)
                    toast.error(
                        isArabic ? "فشل في حفظ العنوان" : "Failed to save address",
                        {
                            description: addressResult.error || (isArabic
                                ? "يرجى المحاولة مرة أخرى"
                                : "Please try again"
                            ),
                        }
                    )
                    return
                }

                const orderPromise = createOrderFromConfiguration(
                    configId,
                    shippingOption,
                    idempotencyKeyRef.current
                )

                const orderTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Order creation timeout')), 30000)
                )

                const orderResult = await Promise.race([
                    orderPromise,
                    orderTimeoutPromise
                ]) as Awaited<ReturnType<typeof createOrderFromConfiguration>>

                if (!orderResult.success) {
                    setIsSubmitting(false)

                    if (orderResult.error?.includes('duplicate') || orderResult.error?.includes('already exists')) {
                        toast.info(
                            isArabic ? "الطلب موجود بالفعل" : "Order already exists",
                            {
                                description: isArabic
                                    ? "سيتم تحويلك إلى صفحة الاكمال "
                                    : "Redirecting to completing page"
                            }
                        )

                        if (orderResult.order?.id) {
                            setTimeout(() => {
                                router.push(`/complete/configId=${configId}?orderId=${orderResult.order?.id}`)
                            }, 1000)
                        }
                        return
                    }

                    toast.error(
                        isArabic ? "فشل في إنشاء الطلب" : "Failed to create order",
                        {
                            description: orderResult.error || (isArabic
                                ? "حدث خطأ، يرجى المحاولة مرة أخرى"
                                : "An error occurred, please try again"
                            ),
                        }
                    )
                    return
                }

                toast.success(
                    isArabic ? "تم إنشاء الطلب بنجاح!" : "Order created successfully!",
                    {
                        description: isArabic
                            ? "جاري التحويل إلى صفحة التأكيد..."
                            : "Redirecting to confirmation page...",
                    }
                )

                window.history.pushState(null, '', window.location.href)

                setTimeout(() => {
                    router.push(`/complete/configId=${configId}?orderId=${orderResult.order?.id}`)
                }, 1500)

            } catch (err) {
                setIsSubmitting(false)

                if (err instanceof Error) {
                    if (err.message === 'Request timeout' || err.message === 'Order creation timeout') {
                        toast.error(
                            isArabic ? "انتهت مهلة الطلب" : "Request timeout",
                            {
                                description: isArabic
                                    ? "يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى"
                                    : "Please check your internet connection and try again"
                            }
                        )
                        return
                    }
                }

                toast.error(
                    isArabic ? "حدث خطأ غير متوقع" : "An unexpected error occurred",
                    {
                        description: isArabic
                            ? "يرجى المحاولة مرة أخرى لاحقاً"
                            : "Please try again later",
                    }
                )
            }
        })
    }

    const isLoading = isPending || isSubmitting

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm space-y-6"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-serif font-light">
                        {t.shippingInformation}
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                        <Label
                            htmlFor="fullName"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <User className="w-4 h-4" />
                            {t.fullName}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="fullName"
                            {...register("fullName")}
                            placeholder={t.fullNamePlaceholder}
                            className={`h-12 transition-all ${errors.fullName
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.fullName
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.fullName && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.fullName.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="phone"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <Phone className="w-4 h-4" />
                            {t.phone}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            {...register("phone")}
                            placeholder={t.phonePlaceholder}
                            className={`h-12 transition-all ${errors.phone
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.phone
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.phone && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.phone.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label
                            htmlFor="email"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <Mail className="w-4 h-4" />
                            {t.email}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            {...register("email")}
                            placeholder={t.emailPlaceholder}
                            className={`h-12 transition-all ${errors.email
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.email
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.email.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label
                            htmlFor="addressLine1"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <Home className="w-4 h-4" />
                            {t.addressLine1}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="addressLine1"
                            {...register("addressLine1")}
                            placeholder={t.addressPlaceholder}
                            className={`h-12 transition-all ${errors.addressLine1
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.addressLine1
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.addressLine1 && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.addressLine1.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="addressLine2" className="text-sm font-medium">
                            {t.addressLine2}
                            <span className="text-muted-foreground text-xs ml-2">
                                ({isArabic ? "اختياري" : "Optional"})
                            </span>
                        </Label>
                        <Input
                            id="addressLine2"
                            {...register("addressLine2")}
                            className="h-12"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">
                            {t.city}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="city"
                            {...register("city")}
                            placeholder={t.cityPlaceholder}
                            className={`h-12 transition-all ${errors.city
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.city
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.city && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.city.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">
                            {t.state}
                        </Label>
                        <Input
                            id="state"
                            {...register("state")}
                            placeholder={t.statePlaceholder}
                            className="h-12"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-medium">
                            {t.postalCode}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="postalCode"
                            {...register("postalCode")}
                            placeholder={t.postalCodePlaceholder}
                            className={`h-12 transition-all ${errors.postalCode
                                ? "border-destructive focus-visible:ring-destructive"
                                : dirtyFields.postalCode
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.postalCode && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-destructive flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.postalCode.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-sm space-y-4"
            >
                <h2 className="text-xl md:text-2xl font-serif font-light mb-6">
                    {t.shippingOption}
                </h2>

                <RadioGroup
                    value={shippingOption}
                    onValueChange={(value: ShippingOption) => setShippingOption(value)}
                    className="space-y-3"
                    disabled={isLoading}
                >
                    {(Object.keys(SHIPPING_OPTIONS) as ShippingOption[]).map((option) => {
                        const config = SHIPPING_OPTIONS[option]
                        const Icon = config.icon
                        const isSelected = shippingOption === option

                        return (
                            <motion.div
                                key={option}
                                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                className={`relative flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <RadioGroupItem
                                    value={option}
                                    id={option}
                                    className="shrink-0"
                                />
                                <Label
                                    htmlFor={option}
                                    className="flex-1 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                                }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    {t[option.charAt(0).toLowerCase() + option.slice(1) as keyof typeof t]}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {isArabic
                                                        ? `التوصيل خلال ${config.daysMin}-${config.daysMax} أيام عمل`
                                                        : `Delivery in ${config.daysMin}-${config.daysMax} business days`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-semibold">
                                                {config.price} {isArabic ? "ج.م" : "EGP"}
                                            </div>
                                        </div>
                                    </div>
                                </Label>
                            </motion.div>
                        )
                    })}
                </RadioGroup>
            </motion.div>

            <Button
                type="submit"
                disabled={isLoading || !isValid}
                size="lg"
                className="w-full h-14 text-base font-semibold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 ltr:mr-2 rtl:ml-2 animate-spin" />
                        {isArabic ? "جاري إنشاء الطلب..." : "Creating Order..."}
                    </>
                ) : (
                    <>
                        <ShoppingBag className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                        {isArabic ? "تأكيد الطلب والدفع عند الاستلام" : "Confirm Order - Cash on Delivery"}
                        <svg
                            className="w-5 h-5 ltr:ml-2 rtl:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={isArabic ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"}
                            />
                        </svg>
                    </>
                )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
                <span className="text-destructive">*</span>{" "}
                {isArabic
                    ? "الحقول المطلوبة"
                    : "Required fields"
                }
            </p>
        </form>
    )
}