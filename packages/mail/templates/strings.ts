/**
 * Every string in every email, in both languages.
 *
 * They live here rather than in apps/www/messages/*.json because mail is rendered by a cron
 * sweep and by the admin app, neither of which loads next-intl. One home per string, and the
 * Arabic is written as Arabic rather than translated from the English shape.
 */
import type { MailLocale } from "../types"

type Copy = Record<MailLocale, string>

export const BRAND: Copy = { en: "Newlight", ar: "نيولايت" }

export const strings = {
    greeting: { en: "Hello", ar: "مرحباً" } as Copy,
    greetingNamed: { en: "Hello {name}", ar: "مرحباً {name}" } as Copy,
    footerRights: { en: "Newlight Egypt", ar: "نيولايت مصر" } as Copy,
    footerAutomated: {
        en: "This message was sent automatically. Please do not reply to it.",
        ar: "تم إرسال هذه الرسالة تلقائياً. برجاء عدم الرد عليها.",
    } as Copy,
    buttonFallback: {
        en: "If the button does not work, copy this link into your browser:",
        ar: "إذا لم يعمل الزر، انسخ هذا الرابط إلى المتصفح:",
    } as Copy,

    verifySubject: { en: "Confirm your email address", ar: "تأكيد بريدك الإلكتروني" } as Copy,
    verifyBody: {
        en: "Confirm this address to finish creating your Newlight account.",
        ar: "أكد هذا البريد لإتمام إنشاء حسابك على نيولايت.",
    } as Copy,
    verifyButton: { en: "Confirm email", ar: "تأكيد البريد" } as Copy,
    verifyExpiry: {
        en: "This link expires in {minutes} minutes.",
        ar: "تنتهي صلاحية هذا الرابط خلال {minutes} دقيقة.",
    } as Copy,
    verifyIgnore: {
        en: "If you did not create an account, you can ignore this message.",
        ar: "إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة.",
    } as Copy,

    resetSubject: { en: "Reset your password", ar: "إعادة تعيين كلمة المرور" } as Copy,
    resetBody: {
        en: "We received a request to reset the password for your Newlight account.",
        ar: "وصلنا طلب لإعادة تعيين كلمة مرور حسابك على نيولايت.",
    } as Copy,
    resetButton: { en: "Reset password", ar: "إعادة تعيين كلمة المرور" } as Copy,
    resetIgnore: {
        en: "If you did not request this, your password has not changed and no action is needed.",
        ar: "إذا لم تطلب ذلك، فلم تتغير كلمة المرور ولا حاجة لأي إجراء.",
    } as Copy,

    orderSubject: { en: "Order {orderNumber} confirmed", ar: "تم تأكيد الطلب {orderNumber}" } as Copy,
    orderBody: {
        en: "Thank you for your order. We will contact you before delivery.",
        ar: "شكراً لطلبك. سنتواصل معك قبل التسليم.",
    } as Copy,
    orderNumber: { en: "Order number", ar: "رقم الطلب" } as Copy,
    orderItems: { en: "Items", ar: "المنتجات" } as Copy,
    orderQuantity: { en: "Qty", ar: "الكمية" } as Copy,
    orderSubtotal: { en: "Subtotal", ar: "الإجمالي الفرعي" } as Copy,
    orderShipping: { en: "Shipping", ar: "الشحن" } as Copy,
    orderTotal: { en: "Total", ar: "الإجمالي" } as Copy,
    orderPaymentCod: { en: "Payment: cash on delivery", ar: "الدفع: نقداً عند الاستلام" } as Copy,
    orderDeliverTo: { en: "Delivery address", ar: "عنوان التسليم" } as Copy,
    orderButton: { en: "View order", ar: "عرض الطلب" } as Copy,

    statusSubject: { en: "Order {orderNumber}: {status}", ar: "الطلب {orderNumber}: {status}" } as Copy,
    statusAwaitingShipment: { en: "awaiting shipment", ar: "في انتظار الشحن" } as Copy,
    statusShipped: { en: "shipped", ar: "تم الشحن" } as Copy,
    statusDelivered: { en: "delivered", ar: "تم التسليم" } as Copy,
    statusCancelled: { en: "cancelled", ar: "تم الإلغاء" } as Copy,
    statusTracking: { en: "Tracking number", ar: "رقم التتبع" } as Copy,

    contactAckSubject: { en: "We received your message", ar: "وصلتنا رسالتك" } as Copy,
    contactAckBody: {
        en: "Thank you for contacting Newlight. A member of our team will reply shortly.",
        ar: "شكراً لتواصلك مع نيولايت. سيرد عليك أحد أعضاء فريقنا قريباً.",
    } as Copy,

    contactAdminSubject: { en: "New contact form: {name}", ar: "رسالة تواصل جديدة: {name}" } as Copy,
    contactAdminBody: { en: "A new contact form was submitted.", ar: "تم إرسال نموذج تواصل جديد." } as Copy,
    contactName: { en: "Name", ar: "الاسم" } as Copy,
    contactEmail: { en: "Email", ar: "البريد الإلكتروني" } as Copy,
    contactPhone: { en: "Phone", ar: "الهاتف" } as Copy,
    contactPosition: { en: "Position", ar: "المسمى الوظيفي" } as Copy,
    contactMessage: { en: "Message", ar: "الرسالة" } as Copy,
    contactButton: { en: "Open in admin", ar: "فتح في لوحة التحكم" } as Copy,
} satisfies Record<string, Copy>

/** `t(strings.verifyExpiry, "ar", { minutes: 30 })`. Missing keys are left visible, not blanked. */
export function t(copy: Copy, locale: MailLocale, values: Record<string, string | number> = {}): string {
    return Object.entries(values).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        copy[locale]
    )
}
