import { z } from 'zod';

// Base schema for shared validations
const baseContactSchema = {
    fullName: z
        .string()
        .min(2)
        .max(100)
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/),

    jobPosition: z
        .string()
        .min(2)
        .max(100),

    email: z
        .string()
        .email(),

    phoneNumber: z
        .string()
        .min(10)
        .max(15)
        .regex(/^[\+]?[0-9]{10,15}$/)
};

export const contactSchema = z.object({
    fullName: baseContactSchema.fullName
        .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" })
        .max(100, { message: "الاسم طويل جداً" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "الاسم يجب أن يحتوي على حروف فقط"
        }),

    jobPosition: baseContactSchema.jobPosition
        .min(2, { message: "المسمى الوظيفي يجب أن يكون حرفين على الأقل" })
        .max(100, { message: "المسمى الوظيفي طويل جداً" }),

    email: baseContactSchema.email
        .email({ message: "البريد الإلكتروني غير صحيح" }),

    phoneNumber: baseContactSchema.phoneNumber
        .min(10, { message: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل" })
        .max(15, { message: "رقم الهاتف طويل جداً" })
        .regex(/^[\+]?[0-9]{10,15}$/, {
            message: "رقم هاتف غير صحيح. مثال: +201234567890 أو 01234567890"
        })
});

export const contactSchemaEN = z.object({
    fullName: baseContactSchema.fullName
        .min(2, { message: "Name must be at least 2 characters" })
        .max(100, { message: "Name is too long" })
        .regex(/^[\u0621-\u064Aa-zA-Z\s]+$/, {
            message: "Name must contain only letters"
        }),

    jobPosition: baseContactSchema.jobPosition
        .min(2, { message: "Job position must be at least 2 characters" })
        .max(100, { message: "Job position is too long" }),

    email: baseContactSchema.email
        .email({ message: "Invalid email address" }),

    phoneNumber: baseContactSchema.phoneNumber
        .min(10, { message: "Phone number must be at least 10 digits" })
        .max(15, { message: "Phone number is too long" })
        .regex(/^[\+]?[0-9]{10,15}$/, {
            message: "Invalid phone number. Example: +201234567890 or 01234567890"
        })
});

export type ContactFormData = z.infer<typeof contactSchema>;

export function getContactSchema(locale?: string): z.ZodType<ContactFormData> {
    if (!locale) {
        return contactSchemaEN as z.ZodType<ContactFormData>;
    }

    return (locale.startsWith("ar") ? contactSchema : contactSchemaEN) as z.ZodType<ContactFormData>;
}