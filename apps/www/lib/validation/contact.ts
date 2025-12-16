import * as z from 'zod';

export const createContactSchema = (translations: {
    fullNameMin: string;
    fullNameMax: string;
    jobPositionMin: string;
    jobPositionMax: string;
    emailInvalid: string;
    phoneMin: string;
    phoneMax: string;
    phoneInvalid: string;
}) => z.object({
    fullName: z.string()
        .min(2, { message: translations.fullNameMin })
        .max(100, { message: translations.fullNameMax }),
    jobPosition: z.string()
        .min(2, { message: translations.jobPositionMin })
        .max(100, { message: translations.jobPositionMax }),
    email: z.string()
        .email({ message: translations.emailInvalid }),
    phoneNumber: z.string()
        .min(10, { message: translations.phoneMin })
        .max(15, { message: translations.phoneMax })
        .regex(/^[+]?[\d\s-()]+$/, { message: translations.phoneInvalid })
});


export type ContactFormData = {
    fullName: string;
    jobPosition: string;
    email: string;
    phoneNumber: string;
};