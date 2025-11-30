"use client"
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Clock, Globe, Mail, MapPin, Navigation, Phone, Send } from 'lucide-react';
import React from 'react';
import { FaWhatsapp } from "react-icons/fa";

interface FormData {
    fullName: string;
    jobPosition: string;
    email: string;
    phoneNumber: string;
}

const ContactPage: React.FC = () => {
    const [formData, setFormData] = React.useState<FormData>({
        fullName: '',
        jobPosition: '',
        email: '',
        phoneNumber: ''
    });

    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

    const handleInputChange = (field: keyof FormData, value: string): void => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Demo request submitted:', formData);
        alert('Demo request submitted successfully!');

        // Reset form
        setFormData({
            fullName: '',
            jobPosition: '',
            email: '',
            phoneNumber: ''
        });
        setIsSubmitting(false);
    };

    const handleGetDirections = (): void => {
        // Open Google Maps with the location
        window.open('https://maps.google.com/?q=Alphabyte+Tower,+New+Administrative+Capital,+Cairo,+Egypt', '_blank');
    };

    return (
        <div className="min-h-screen transition-colors duration-300 py-10 md:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                <div className="rounded-2xl overflow-hidden">
                    <div className="py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-2">
                                <h1 className="text-3xl lg:text-4xl font-bold transition-colors duration-300 text-gray-900 dark:text-white">
                                    Get In Touch
                                </h1>
                                <p className="leading-relaxed max-w-md transition-colors duration-300 text-muted-foreground">
                                    We'd love to hear from you! Whether you have questions, need
                                    support, or want to learn more about our services, our team is here
                                    to help.
                                </p>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold transition-colors duration-300 text-gray-900 dark:text-white">
                                                Our Address
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="pl-15 space-y-1">
                                        <p className="text-sm font-medium transition-colors duration-300 text-muted-foreground">
                                            New Light
                                        </p>
                                        <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                            86 Abbas El-Akkad, Al Manteqah Al Oula,
                                        </p>
                                        <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                            Nasr City, Cairo
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 bg-primary/15 text-primary">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold transition-colors duration-300 text-foreground">
                                                Contact Info
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="pl-15 space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <Link href="tel:+201066076077" className="text-sm transition-colors duration-300 text-muted-foreground">
                                                +20 10 66076077
                                            </Link>
                                        </div>
                                        <div className="flex items-center space-x-2 ">
                                            <FaWhatsapp className="w-4 h-4" />
                                            <Link href="https://wa.me/201066076077" className="text-sm transition-colors duration-300 text-muted-foreground">
                                                WhatsApp 24/7 Support
                                            </Link>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Mail className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                                hello@alphabyte.dev
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                                            <p className="text-sm transition-colors duration-300 text-muted-foreground">
                                                Sun-Thu: 9AM - 6PM
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='py-3'>
                            <button
                                onClick={handleGetDirections}
                                className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                            >
                                <Navigation className="w-5 h-5" />
                                <span>Get Directions</span>
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="h-64 sm:h-80 lg:h-96">
                            <iframe
                                src="https://www.google.com/maps/place/86+Abbas+El-Akkad,+Al+Manteqah+Al+Oula,+Nasr+City,+Cairo+Governorate+4450303/@30.0569394,31.3357533,17z/data=!3m1!4b1!4m6!3m5!1s0x14583e65c2004317:0x39c0906de32bb05d!8m2!3d30.0569394!4d31.3383282!16s%2Fg%2F11l_cy9ycs?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Alphabyte Tower Location"
                                className="w-full h-full"
                            />
                        </div>
                        <div className="absolute inset-0 bg-background/20 pointer-events-none" />
                    </div>
                    <div className="py-8">
                        <div className="max-w-5xl mx-auto flex justify-center flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <h2 className="flex items-center text-2xl lg:text-3xl font-bold mb-6 transition-colors duration-300 text-gray-900 dark:text-white text-nowrap w-full">
                                    Request a Demo
                                </h2>
                                <div className='flex items-end flex-col gap-6'>
                                    <div className='grid grid-cols-2 gap-4 w-full'>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="fullName"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                Full Name*
                                            </label>
                                            <input
                                                type="text"
                                                id="fullName"
                                                value={formData.fullName}
                                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                placeholder="Enter your name"
                                                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent border bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="jobPosition"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                Job Position
                                            </label>
                                            <input
                                                type="text"
                                                id="jobPosition"
                                                value={formData.jobPosition}
                                                onChange={(e) => handleInputChange('jobPosition', e.target.value)}
                                                placeholder="Enter your job position"
                                                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent border bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="email"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                placeholder="Enter your email"
                                                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent border bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="phoneNumber"
                                                className="block text-sm font-medium transition-colors duration-300 text-muted-foreground"
                                            >
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                id="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                                placeholder="Enter your phone number"
                                                className="w-full px-4 py-3 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent border bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className='w-full'>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || !formData.fullName || !formData.jobPosition || !formData.email || !formData.phoneNumber}
                                            className="w-full px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Submitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    <span>Request Demo</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-border">
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="w-4 h-4" />
                                        <span>Available in Arabic & English</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span>•</span>
                                        <span>Response within 24 hours</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span>•</span>
                                        <span>Free consultation</span>
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