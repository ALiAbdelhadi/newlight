"use client"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { ContactFormData, getContactSchema } from '@/lib/validation/contact';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Globe, Mail, MapPin, Navigation, Phone, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaWhatsapp } from "react-icons/fa";

const ContactPage: React.FC = () => {
    const t = useTranslations('contact');
    const locale = useLocale();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm<ContactFormData>({
        resolver: zodResolver(getContactSchema(locale)),
        defaultValues: {
            fullName: "",
            jobPosition: "",
            email: "",
            phoneNumber: ""
        }
    });

    const onSubmit = async (data: ContactFormData): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Demo request submitted:', data);
        alert(t('form.successMessage'));
        reset();
    };

    const handleGetDirections = (): void => {
        window.open('https://maps.google.com/?q=86%20Abbas%20El-Akkad%2C%20Al%20Manteqah%20Al%20Oula%2C%20Nasr%20City%2C%20Cairo%20Governorate', '_blank');
    };

    return (
        <div className="min-h-screen transition-colors duration-300 py-10 md:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                <div className="rounded-2xl overflow-hidden">
                    <div className="py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-2">
                                <h1 className="text-3xl lg:text-4xl font-bold transition-colors duration-300 text-gray-900 dark:text-white">
                                    {t('title')}
                                </h1>
                                <p className="leading-relaxed max-w-md transition-colors duration-300 text-muted-foreground">
                                    {t('description')}
                                </p>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold transition-colors duration-300 text-gray-900 dark:text-white">
                                                {t('address.title')}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="ltr:pl-15 rtl:pr-15 space-y-1">
                                        <p className="text-sm font-medium transition-colors duration-300 text-muted-foreground">
                                            {t('address.company')}
                                        </p>
                                        <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                            {t('address.street')}
                                        </p>
                                        <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                            {t('address.city')}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 bg-primary/15 text-primary">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold transition-colors duration-300 text-foreground">
                                                {t('contactInfo.title')}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="ltr:pl-15 rtl:pr-15 space-y-2">
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            <Phone className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <Link href="tel:+201066076077" className="text-sm transition-colors duration-300 text-muted-foreground hover:text-foreground">
                                                +20 10 66076077
                                            </Link>
                                        </div>
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            <FaWhatsapp className="w-4 h-4 text-muted-foreground" />
                                            <Link href="https://wa.me/201066076077" target="_blank" className="text-sm transition-colors duration-300 text-muted-foreground hover:text-foreground">
                                                {t('contactInfo.whatsapp')}
                                            </Link>
                                        </div>
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            <Mail className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                                <Link
                                                    href="mailto:mostafa@newlight-eg.com"
                                                    className="underline underline-offset-4 hover:opacity-80 transition"
                                                >
                                                    mostafa@newlight-eg.com
                                                </Link>
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                            <Clock className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                                {t('contactInfo.workingHours')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='py-3'>
                            <Button
                                onClick={handleGetDirections}
                                size={"lg"}
                                className="w-full sm:w-auto font-medium transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-md hover:shadow-lg"
                            >
                                <Navigation className="w-5 h-5" />
                                <span>{t('getDirections')}</span>
                            </Button>
                        </div>
                    </div>
                    <div className="relative pb-8">
                        <div className="h-110">
                            <div className="relative w-full h-110">
                                <iframe
                                    className="absolute top-0 left-0 w-full h-110 rounded-xl"
                                    src="https://maps.google.com/maps?width=600&height=400&hl=en&q=86%20Abbas%20El-Akkad%2C%20Al%20Manteqah%20Al%20Oula%2C%20Nasr%20City%2C%20Cairo%20Governorate&t=&z=16&ie=UTF8&iwloc=B&output=embed"
                                    title="New Light Company Location"
                                />
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-background/20 pointer-events-none" />
                    </div>
                    <div className="py-8">
                        <div className="max-w-5xl mx-auto flex justify-center flex-col">
                            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <h2 className="flex items-center text-2xl lg:text-3xl font-bold mb-6 transition-colors duration-300 text-gray-900 dark:text-white text-nowrap w-full">
                                    {t('form.title')}
                                </h2>
                                <div className='flex items-end flex-col gap-6'>
                                    <div className='grid grid-cols-2 gap-4 w-full'>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="fullName"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                {t('form.fields.fullName')}
                                            </Label>
                                            <Input
                                                type="text"
                                                id="fullName"
                                                {...register('fullName')}
                                                placeholder={t('form.placeholders.fullName')}
                                                className={`w-full h-12 ${errors.fullName ? "border-destructive" : ""}`}
                                            />
                                            {errors.fullName && (
                                                <p className="text-sm text-destructive">{errors.fullName.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="jobPosition"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                {t('form.fields.jobPosition')}
                                            </Label>
                                            <Input
                                                type="text"
                                                id="jobPosition"
                                                {...register('jobPosition')}
                                                placeholder={t('form.placeholders.jobPosition')}
                                                className={`w-full h-12 ${errors.jobPosition ? "border-destructive" : ""}`}
                                            />
                                            {errors.jobPosition && (
                                                <p className="text-sm text-destructive">{errors.jobPosition.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="email"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                {t('form.fields.email')}
                                            </Label>
                                            <Input
                                                type="email"
                                                id="email"
                                                {...register('email')}
                                                placeholder={t('form.placeholders.email')}
                                                className={`w-full h-12 ${errors.email ? "border-destructive" : ""}`}
                                            />
                                            {errors.email && (
                                                <p className="text-sm text-destructive">{errors.email.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="phoneNumber"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                {t('form.fields.phoneNumber')}
                                            </Label>
                                            <Input
                                                type="tel"
                                                id="phoneNumber"
                                                {...register('phoneNumber')}
                                                placeholder={t('form.placeholders.phoneNumber')}
                                                className={`w-full h-12 ${errors.phoneNumber ? "border-destructive" : ""}`}
                                            />
                                            {errors.phoneNumber && (
                                                <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className='w-full'>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-14 text-base uppercase tracking-[0.2em] px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>{t('form.submitting')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    <span>{t('form.submit')}</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                            <div className="mt-8 pt-6 border-t border-border">
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 rtl:sm:space-x-reverse text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <Globe className="w-4 h-4" />
                                        <span>{t('footer.languages')}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <span>•</span>
                                        <span>{t('footer.responseTime')}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <span>•</span>
                                        <span>{t('footer.consultation')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;