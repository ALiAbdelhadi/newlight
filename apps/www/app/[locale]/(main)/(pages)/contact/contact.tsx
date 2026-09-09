"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Clock, Mail, MapPin, Navigation, Phone, Send } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa"
import { toast } from "sonner"

import { Container, PageHeader, Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type ContactFormData, getContactSchema } from "@/lib/validation/contact"

const MAP_QUERY = "86%20Abbas%20El-Akkad%2C%20Al%20Manteqah%20Al%20Oula%2C%20Nasr%20City%2C%20Cairo%20Governorate"
const SOCIAL = {
    facebook: "https://www.facebook.com/share/17vq5UgeWM/",
    instagram: "https://www.instagram.com/newl_ight0/",
}

type Field = keyof ContactFormData

/**
 * Contact.
 *
 * The last page on the storefront still styling itself with `text-gray-900 dark:text-white`,
 * `bg-emerald-100 dark:bg-emerald-900/50` and a green success banner — colours from no token,
 * a `dark:` branch in a component, and a second copy of a message the toast already shows.
 * It also set its own `max-w-7xl mx-auto p-4 lg:p-8` inside a `rounded-2xl` wrapper, so its
 * content was narrower than every other page's and inset by a different gutter.
 *
 * Same page, on the shared skeleton: `PageHeader`, one `Section`, the `Container` width, and
 * the token palette. The form's copy, validation and endpoint are untouched.
 */
export default function ContactPage() {
    const t = useTranslations("contact")
    const locale = useLocale()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ContactFormData>({
        resolver: zodResolver(getContactSchema(locale)),
        defaultValues: { fullName: "", jobPosition: "", email: "", phoneNumber: "" },
    })

    const onSubmit = async (data: ContactFormData) => {
        try {
            // The route is app/[locale]/api/contact — it reads the locale from the segment to
            // pick the language of the acknowledgement email. A bare /api/contact is a 404.
            const response = await fetch(`/${locale}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || "Failed to submit form")

            toast.success(t("form.successMessage"), { description: t("form.successDescription"), duration: 5000 })
            reset()
        } catch (error) {
            console.error("Contact form error:", error)
            toast.error(t("form.errorMessage"), {
                description: error instanceof Error ? error.message : t("form.errorDescription"),
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
        <>
            <PageHeader title={t("title")} description={t("description")} />

            <Section spacing="tight">
                <Container>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
                        {/* -------------------------------------------------- how to reach us */}
                        <div className="space-y-6 lg:col-span-2">
                            <section aria-labelledby="contact-address" className="rounded-lg border bg-card p-6">
                                <h2 id="contact-address" className="flex items-center gap-3 font-semibold">
                                    <MapPin aria-hidden className="size-5 text-primary" />
                                    {t("address.title")}
                                </h2>
                                <address className="mt-4 text-sm leading-relaxed text-muted-foreground not-italic">
                                    <p className="font-medium text-foreground">{t("address.company")}</p>
                                    <p>{t("address.street")}</p>
                                    <p>{t("address.city")}</p>
                                </address>
                                <Button asChild variant="outline" size="sm" className="mt-5">
                                    <a href={`https://maps.google.com/?q=${MAP_QUERY}`} target="_blank" rel="noopener noreferrer">
                                        <Navigation aria-hidden />
                                        {t("getDirections")}
                                    </a>
                                </Button>
                            </section>

                            <section aria-labelledby="contact-info" className="rounded-lg border bg-card p-6">
                                <h2 id="contact-info" className="flex items-center gap-3 font-semibold">
                                    <Phone aria-hidden className="size-5 text-primary" />
                                    {t("contactInfo.title")}
                                </h2>
                                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-3">
                                        <Phone aria-hidden className="size-4 shrink-0" />
                                        <a href="tel:+201066076077" dir="ltr" className="transition-colors duration-(--duration-fast) hover:text-foreground">
                                            +20 10 66076077
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <FaWhatsapp aria-hidden className="size-4 shrink-0" />
                                        <a
                                            href="https://wa.me/201066076077"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="transition-colors duration-(--duration-fast) hover:text-foreground"
                                        >
                                            {t("contactInfo.whatsapp")}
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Mail aria-hidden className="size-4 shrink-0" />
                                        <a href="mailto:mostafa@newlight-eg.com" dir="ltr" className="transition-colors duration-(--duration-fast) hover:text-foreground">
                                            mostafa@newlight-eg.com
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Clock aria-hidden className="size-4 shrink-0" />
                                        <span>{t("contactInfo.workingHours")}</span>
                                    </li>
                                </ul>
                            </section>

                            <section aria-labelledby="contact-social" className="rounded-lg border bg-card p-6">
                                <h2 id="contact-social" className="font-semibold">
                                    {t("social-header")}
                                </h2>
                                <div className="mt-4 flex gap-2">
                                    <a
                                        href={SOCIAL.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Facebook"
                                        className="grid size-10 place-items-center rounded-md border transition-colors duration-(--duration-fast) hover:border-primary hover:text-primary"
                                    >
                                        <FaFacebook aria-hidden className="size-5" />
                                    </a>
                                    <a
                                        href={SOCIAL.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Instagram"
                                        className="grid size-10 place-items-center rounded-md border transition-colors duration-(--duration-fast) hover:border-primary hover:text-primary"
                                    >
                                        <FaInstagram aria-hidden className="size-5" />
                                    </a>
                                </div>
                            </section>
                        </div>

                        {/* ------------------------------------------------------------ form */}
                        <section aria-labelledby="contact-form" className="rounded-lg border bg-card p-6 lg:col-span-3 lg:p-8">
                            <h2 id="contact-form" className="text-2xl font-semibold tracking-tight">
                                {t("form.title")}
                            </h2>
                            <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="mt-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {fields.map((field) => {
                                        const error = errors[field.name]?.message
                                        return (
                                            <div key={field.name} className="space-y-1.5">
                                                <Label htmlFor={field.name}>{t(`form.fields.${field.name}`)}</Label>
                                                <Input
                                                    id={field.name}
                                                    type={field.type}
                                                    dir={field.dir}
                                                    autoComplete={field.autoComplete}
                                                    placeholder={t(`form.placeholders.${field.name}`)}
                                                    aria-invalid={error ? true : undefined}
                                                    aria-describedby={error ? `${field.name}-error` : undefined}
                                                    className={cn(error && "border-danger")}
                                                    {...register(field.name)}
                                                />
                                                {error && (
                                                    <p id={`${field.name}-error`} className="text-xs text-danger">
                                                        {error}
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <Button type="submit" size="lg" disabled={isSubmitting} className="mt-6 w-full sm:w-auto">
                                    <Send aria-hidden />
                                    {isSubmitting ? t("form.submitting") : t("form.submit")}
                                </Button>
                            </form>
                        </section>
                    </div>

                    {/* --------------------------------------------------------------- map */}
                    <div className="mt-6 overflow-hidden rounded-lg border bg-surface-sunk lg:mt-8">
                        <iframe
                            className="block h-[26rem] w-full"
                            src={`https://maps.google.com/maps?width=600&height=400&hl=${locale}&q=${MAP_QUERY}&t=&z=16&ie=UTF8&iwloc=B&output=embed`}
                            title={t("address.title")}
                            loading="lazy"
                        />
                    </div>
                </Container>
            </Section>
        </>
    )
}
