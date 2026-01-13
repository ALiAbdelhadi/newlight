import { z } from "zod"

// Base schema for shared validations
const baseShippingSchema = {
    fullName: z
        .string()
        .min(3)
        .max(100)
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/),

    phone: z
        .string()
        .min(10)
        .max(15)
        .regex(/^[\+]?[0-9]{10,15}$/),

    email: z
        .string()
        .email()
        .optional()
        .or(z.literal("")),

    addressLine1: z
        .string()
        .min(10)
        .max(200),

    addressLine2: z
        .string()
        .max(200)
        .optional()
        .or(z.literal("")),

    city: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/),

    state: z
        .string()
        .min(2)
        .max(50)
        .optional()
        .or(z.literal("")),

    postalCode: z
        .string()
        .min(5)
        .max(10)
        .regex(/^[0-9]+$/),
}

// Arabic schema with error messages
export const shippingAddressSchema = z.object({
    fullName: baseShippingSchema.fullName
        .min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" })
        .max(100, { message: "الاسم طويل جداً" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "الاسم يجب أن يحتوي على حروف فقط"
        }),

    phone: baseShippingSchema.phone
        .min(10, { message: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل" })
        .max(15, { message: "رقم الهاتف طويل جداً" })
        .regex(/^[\+]?[0-9]{10,15}$/, {
            message: "رقم هاتف غير صحيح. مثال: +201234567890 أو 01234567890"
        }),

    email: z
        .string()
        .email({ message: "البريد الإلكتروني غير صحيح" })
        .optional()
        .or(z.literal("")),

    addressLine1: baseShippingSchema.addressLine1
        .min(10, { message: "العنوان يجب أن يكون 10 أحرف على الأقل" })
        .max(200, { message: "العنوان طويل جداً" }),

    addressLine2: z
        .string()
        .max(200, { message: "العنوان طويل جداً" })
        .optional()
        .or(z.literal("")),

    city: baseShippingSchema.city
        .min(2, { message: "اسم المدينة يجب أن يكون حرفين على الأقل" })
        .max(50, { message: "اسم المدينة طويل جداً" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "اسم المدينة يجب أن يحتوي على حروف فقط"
        }),

    state: z
        .string()
        .min(2, { message: "اسم المحافظة يجب أن يكون حرفين على الأقل" })
        .max(50, { message: "اسم المحافظة طويل جداً" })
        .optional()
        .or(z.literal("")),

    postalCode: baseShippingSchema.postalCode
        .min(5, { message: "الرمز البريدي يجب أن يكون 5 أرقام على الأقل" })
        .max(10, { message: "الرمز البريدي طويل جداً" })
        .regex(/^[0-9]+$/, {
            message: "الرمز البريدي يجب أن يحتوي على أرقام فقط"
        })
})

// English schema with error messages
export const shippingAddressSchemaEN = z.object({
    fullName: baseShippingSchema.fullName
        .min(3, { message: "Name must be at least 3 characters" })
        .max(100, { message: "Name is too long" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "Name must contain only letters"
        }),

    phone: baseShippingSchema.phone
        .min(10, { message: "Phone number must be at least 10 digits" })
        .max(15, { message: "Phone number is too long" })
        .regex(/^[\+]?[0-9]{10,15}$/, {
            message: "Invalid phone number. Example: +201234567890 or 01234567890"
        }),

    email: z
        .string()
        .email({ message: "Invalid email address" })
        .optional()
        .or(z.literal("")),

    addressLine1: baseShippingSchema.addressLine1
        .min(10, { message: "Address must be at least 10 characters" })
        .max(200, { message: "Address is too long" }),

    addressLine2: z
        .string()
        .max(200, { message: "Address is too long" })
        .optional()
        .or(z.literal("")),

    city: baseShippingSchema.city
        .min(2, { message: "City name must be at least 2 characters" })
        .max(50, { message: "City name is too long" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "City name must contain only letters"
        }),

    state: z
        .string()
        .min(2, { message: "State name must be at least 2 characters" })
        .max(50, { message: "State name is too long" })
        .optional()
        .or(z.literal("")),

    postalCode: baseShippingSchema.postalCode
        .min(5, { message: "Postal code must be at least 5 digits" })
        .max(10, { message: "Postal code is too long" })
        .regex(/^[0-9]+$/, {
            message: "Postal code must contain only numbers"
        })
})

// Helper function to get the right schema based on locale
export function getShippingSchema(locale?: string) {
    if (!locale) {
        return shippingAddressSchemaEN
    }

    return locale.startsWith("ar") ? shippingAddressSchema : shippingAddressSchemaEN
}

// Type inference from schema
export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>