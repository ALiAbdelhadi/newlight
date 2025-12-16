import { useTranslations } from 'next-intl';
import * as z from 'zod';

export const createContactSchema = (t: ReturnType<typeof useTranslations>) => z.object({
    fullName: z.string()
        .min(2, { message: t('form.validation.fullName.min') })
        .max(100, { message: t('form.validation.fullName.max') }),
    jobPosition: z.string()
        .min(2, { message: t('form.validation.jobPosition.min') })
        .max(100, { message: t('form.validation.jobPosition.max') }),
    email: z.string()
        .email({ message: t('form.validation.email.invalid') }),
    phoneNumber: z.string()
        .min(10, { message: t('form.validation.phoneNumber.min') })
        .max(15, { message: t('form.validation.phoneNumber.max') })
        .regex(/^[+]?[\d\s-()]+$/, { message: t('form.validation.phoneNumber.invalid') })
});

export type ContactFormData = z.infer<ReturnType<typeof createContactSchema>>;