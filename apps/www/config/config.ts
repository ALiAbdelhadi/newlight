import { ProductColorTemp, SupportedLanguage } from "@/types/index";

export const PRODUCT_TEMP_LABEL_MAP: Record<SupportedLanguage, Record<ProductColorTemp, string>> = {
    en: {
        warm: "Warm",
        cool: "Cool",
        white: "White",
    },
    ar: {
        warm: "دافئ",
        cool: "بارد",
        white: "أبيض",
    },
};