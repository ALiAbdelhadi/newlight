"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import type { ShippingAddress } from "@repo/database"

import { deleteMyShippingAddress, saveMyShippingAddress } from "@/actions/account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getShippingSchema, type ShippingAddressFormData } from "@/lib/validation/shipping"

type Field = keyof ShippingAddressFormData

export function AddressCard({ address, email }: { address: ShippingAddress | null; email: string }) {
    const t = useTranslations("account.address")
    const [editing, setEditing] = useState(address === null)
    const [pending, startTransition] = useTransition()

    const remove = () => {
        if (!window.confirm(t("deleteConfirm"))) return
        startTransition(async () => {
            const result = await deleteMyShippingAddress()
            if (result.ok) {
                toast.success(t("deleted"))
                setEditing(true)
            } else toast.error(t("failed"))
        })
    }

    return (
        <section aria-labelledby="account-address" className="rounded-lg border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
                <h2 id="account-address" className="text-xs font-medium tracking-label text-muted-foreground uppercase">
                    {t("title")}
                </h2>
                {address && !editing && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                            {t("edit")}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={pending} onClick={remove} className="text-danger hover:text-danger">
                            {t("delete")}
                        </Button>
                    </div>
                )}
            </div>

            {editing ? (
                <AddressForm
                    address={address}
                    email={email}
                    onDone={() => setEditing(false)}
                    onCancel={address ? () => setEditing(false) : undefined}
                />
            ) : address ? (
                <address className="mt-5 text-sm leading-relaxed not-italic">
                    <p className="font-medium">
                        <bdi dir="auto">{address.fullName}</bdi>
                    </p>
                    <p className="text-muted-foreground" dir="ltr">
                        {address.phone}
                    </p>
                    <p className="mt-3">
                        <bdi dir="auto">{address.addressLine1}</bdi>
                    </p>
                    {address.addressLine2 && (
                        <p>
                            <bdi dir="auto">{address.addressLine2}</bdi>
                        </p>
                    )}
                    <p>
                        <bdi dir="auto">{[address.city, address.state].filter(Boolean).join(", ")}</bdi> {address.postalCode}
                    </p>
                    <p className="text-muted-foreground">{address.country}</p>
                </address>
            ) : null}
        </section>
    )
}

function AddressForm({
    address,
    email,
    onDone,
    onCancel,
}: {
    address: ShippingAddress | null
    email: string
    onDone: () => void
    onCancel?: () => void
}) {
    const t = useTranslations("account.address")
    const locale = useLocale()
    const [pending, startTransition] = useTransition()

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ShippingAddressFormData>({
        resolver: zodResolver(getShippingSchema(locale)),
        defaultValues: {
            fullName: address?.fullName ?? "",
            phone: address?.phone ?? "",
            email: address?.email ?? email,
            addressLine1: address?.addressLine1 ?? "",
            addressLine2: address?.addressLine2 ?? "",
            city: address?.city ?? "",
            state: address?.state ?? "",
            postalCode: address?.postalCode ?? "",
        },
    })

    const onSubmit = (data: ShippingAddressFormData) => {
        startTransition(async () => {
            const result = await saveMyShippingAddress(locale, data)
            if (result.ok) {
                toast.success(t("saved"))
                onDone()
                return
            }
            if (result.errors) {
                for (const [field, message] of Object.entries(result.errors)) {
                    setError(field as Field, { message })
                }
                return
            }
            toast.error(t("failed"))
        })
    }

    const fields: Array<{ name: Field; span?: boolean; type?: string; dir?: "ltr" }> = [
        { name: "fullName" },
        { name: "phone", type: "tel", dir: "ltr" },
        { name: "email", type: "email", dir: "ltr", span: true },
        { name: "addressLine1", span: true },
        { name: "addressLine2", span: true },
        { name: "city" },
        { name: "state" },
        { name: "postalCode", dir: "ltr" },
    ]

    return (
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                    const id = `address-${field.name}`
                    const error = errors[field.name]?.message
                    return (
                        <div key={field.name} className={cn("space-y-1.5", field.span && "sm:col-span-2")}>
                            <Label htmlFor={id}>{t(`fields.${field.name}`)}</Label>
                            <Input
                                id={id}
                                type={field.type ?? "text"}
                                dir={field.dir}
                                autoComplete={AUTOCOMPLETE[field.name]}
                                aria-invalid={error ? true : undefined}
                                aria-describedby={error ? `${id}-error` : undefined}
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
            <div className="mt-5 flex flex-wrap gap-2">
                <Button type="submit" disabled={pending}>
                    {pending ? t("saving") : t("save")}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
                        {t("cancel")}
                    </Button>
                )}
            </div>
        </form>
    )
}

const AUTOCOMPLETE: Record<Field, string> = {
    fullName: "name",
    phone: "tel",
    email: "email",
    addressLine1: "address-line1",
    addressLine2: "address-line2",
    city: "address-level2",
    state: "address-level1",
    postalCode: "postal-code",
}
