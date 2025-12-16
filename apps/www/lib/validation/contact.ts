import { z } from 'zod';

const baseContactSchema = {
    fullName: z
        .string()
        .min(2)
        .max(100),

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
        .regex(/^[+]?[\d\s-()]+$/)
};


export const contactSchema = z.object({
    fullName: baseContactSchema.fullName
        .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" })
        .max(100, { message: "الاسم طويل جداً" }),

    jobPosition: baseContactSchema.jobPosition
        .min(2, { message: "المسمى الوظيفي يجب أن يكون حرفين على الأقل" })
        .max(100, { message: "المسمى الوظيفي طويل جداً" }),

    email: baseContactSchema.email
        .email({ message: "البريد الإلكتروني غير صحيح" }),

    phoneNumber: baseContactSchema.phoneNumber
        .min(10, { message: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل" })
        .max(15, { message: "رقم الهاتف طويل جداً" })
        .regex(/^[+]?[\d\s-()]+$/, { message: "رقم هاتف غير صحيح" })
});


export const contactSchemaEN = z.object({
    fullName: baseContactSchema.fullName
        .min(2, { message: "Name must be at least 2 characters" })
        .max(100, { message: "Name is too long" }),

    jobPosition: baseContactSchema.jobPosition
        .min(2, { message: "Job position must be at least 2 characters" })
        .max(100, { message: "Job position is too long" }),

    email: baseContactSchema.email
        .email({ message: "Invalid email address" }),

    phoneNumber: baseContactSchema.phoneNumber
        .min(10, { message: "Phone number must be at least 10 digits" })
        .max(15, { message: "Phone number is too long" })
        .regex(/^[+]?[\d\s-()]+$/, { message: "Invalid phone number" })
});

export function getContactSchema(locale?: string) {
    if (!locale) {
        return contactSchemaEN;
    }

    return locale.startsWith("ar") ? contactSchema : contactSchemaEN;
}


export type ContactFormData = z.infer<typeof contactSchema>;