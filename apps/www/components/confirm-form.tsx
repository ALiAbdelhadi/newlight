"use client"

import { createOrderFromConfiguration, saveShippingAddress } from "@/actions/order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup } from "@/components/ui/radio-group"
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
                    const errorMsg = 'error' in addressResult ? addressResult.error : null;
                    toast.error(
                        isArabic ? "فشل في حفظ العنوان" : "Failed to save address",
                        {
                            description: errorMsg || (isArabic
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
                    const errorMsg = 'error' in orderResult ? orderResult.error : null;

                    if (errorMsg?.includes('duplicate') || errorMsg?.includes('already exists')) {
                        toast.info(
                            isArabic ? "الطلب موجود بالفعل" : "Order already exists",
                            {
                                description: isArabic
                                    ? "سيتم تحويلك إلى صفحة الاكمال "
                                    : "Redirecting to completing page"
                            }
                        )

                        const orderId = 'order' in orderResult ? orderResult.order?.id : null;
                        if (orderId) {
                            setTimeout(() => {
                                router.push(`/complete/configId=${configId}?orderId=${orderId}`)
                            }, 1000)
                        }
                        return
                    }

                    toast.error(
                        isArabic ? "فشل في إنشاء الطلب" : "Failed to create order",
                        {
                            description: errorMsg || (isArabic
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

                const orderId = 'order' in orderResult ? orderResult.order?.id : null;
                setTimeout(() => {
                    router.push(`/complete/configId=${configId}?orderId=${orderId}`)
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 md:space-y-12">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-card/50 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-border/50 shadow-premium space-y-8"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-serif italic text-foreground leading-none">
                            {t.shippingInformation}
                        </h2>
                        <div className="h-px w-12 bg-primary mt-2 opacity-40" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3">
                        <Label
                            htmlFor="fullName"
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            <User className="w-3.5 h-3.5" />
                            {t.fullName}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="fullName"
                            {...register("fullName")}
                            placeholder={t.fullNamePlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-lg ${errors.fullName ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.fullName && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs text-destructive font-medium flex items-center gap-1 mt-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.fullName.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Phone */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="phone"
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            {t.phone}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="phone"
                            {...register("phone")}
                            placeholder={t.phonePlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-lg ${errors.phone ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.phone && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs text-destructive font-medium flex items-center gap-1 mt-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.phone.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Email */}
                    <div className="space-y-3 md:col-span-2">
                        <Label
                            htmlFor="email"
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            {t.email}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="email"
                            {...register("email")}
                            placeholder={t.emailPlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-lg ${errors.email ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Address Line 1 */}
                    <div className="space-y-3 md:col-span-2">
                        <Label
                            htmlFor="addressLine1"
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            <Home className="w-3.5 h-3.5" />
                            {t.addressLine1}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="addressLine1"
                            {...register("addressLine1")}
                            placeholder={t.addressPlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-lg ${errors.addressLine1 ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Address Line 2 */}
                    <div className="space-y-3 md:col-span-2">
                        <Label
                            htmlFor="addressLine2"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            {t.addressLine2}
                            <span className="text-muted-foreground text-[10px] ml-2 font-normal lowercase italic tracking-normal">
                                ({isArabic ? "اختياري" : "Optional"})
                            </span>
                        </Label>
                        <Input
                            id="addressLine2"
                            {...register("addressLine2")}
                            className="h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-lg"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label
                            htmlFor="city"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            {t.city}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="city"
                            {...register("city")}
                            placeholder={t.cityPlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-lg ${errors.city ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                        <AnimatePresence mode="wait">
                            {errors.city && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs text-destructive font-medium flex items-center gap-1 mt-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.city.message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* State/Governorate */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="state"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            {isArabic ? "المحافظة" : "Governorate"}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="state"
                            {...register("state")}
                            placeholder={isArabic ? "اختر المحافظة" : "Select Governorate"}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-lg ${errors.state ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Postal Code */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="postalCode"
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80"
                        >
                            {t.postalCode}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="postalCode"
                            {...register("postalCode")}
                            placeholder={t.postalCodePlaceholder}
                            className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300 rounded-lg ${errors.postalCode ? "border-destructive/50" : ""}`}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Shipping Box */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/50 shadow-premium space-y-8"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-serif italic text-foreground leading-none">
                            {t.shippingOption}
                        </h2>
                        <div className="h-px w-12 bg-primary mt-2 opacity-40" />
                    </div>
                </div>

                <RadioGroup
                    value={shippingOption}
                    onValueChange={(value: ShippingOption) => setShippingOption(value)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    disabled={isLoading}
                >
                    {(Object.keys(SHIPPING_OPTIONS) as ShippingOption[]).map((option) => {
                        const config = SHIPPING_OPTIONS[option]
                        const Icon = config.icon
                        const isSelected = shippingOption === option

                        return (
                            <motion.div
                                key={option}
                                className={`relative group p-6 border rounded-2xl transition-all duration-500 flex flex-col items-center text-center space-y-4 ${isSelected
                                    ? "border-primary/40 bg-primary/[0.03] shadow-inner"
                                    : "border-border/50 bg-background/30 hover:border-primary/20 hover:bg-background/50"
                                    } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                onClick={() => !isLoading && setShippingOption(option)}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                    }`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                
                                <div className="space-y-1">
                                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
                                        {t[option.charAt(0).toLowerCase() + option.slice(1) as keyof typeof t]}
                                    </div>
                                    <div className="font-serif italic text-xl text-foreground">
                                        {config.price} {isArabic ? "ج.م" : "EGP"}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                        {isArabic
                                            ? `${config.daysMin}-${config.daysMax} أيام`
                                            : `${config.daysMin}-${config.daysMax} days`
                                        }
                                    </p>
                                </div>

                                {isSelected && (
                                    <motion.div
                                        layoutId="shipping-selection"
                                        className="absolute -top-px -right-px w-8 h-8 bg-primary rounded-tr-2xl rounded-bl-2xl flex items-center justify-center text-primary-foreground"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
                                            <path d="M20 6L9 17L4 12" />
                                        </svg>
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </RadioGroup>
            </motion.div>

            <div className="pt-8">
            <Button
                type="submit"
                disabled={isLoading || !isValid}
                size="lg"
                className="w-full h-14 text-xs md:text-base font-semibold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 ltr:mr-2 rtl:ml-2 animate-spin" />
                        {isArabic ? "جاري إنشاء الطلب..." : "Creating Order..."}
                    </>
                ) : (
                    <>
                        <ShoppingBag className="w-5 h-5 ltr:mr-2 rtl:ml-2 hidden md:block" />
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

                
                <p className="mt-8 text-[10px] text-center text-muted-foreground/60 uppercase tracking-[0.3em]">
                    {isArabic
                        ? "بمجرد النقر، أنت تقبل شروطنا وأحكامنا"
                        : "By confirming, you agree to our terms and conditions"
                    }
                </p>
            </div>
        </form>
    )
}