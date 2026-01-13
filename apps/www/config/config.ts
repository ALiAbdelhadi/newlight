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



export const DEBOUNCE_DELAY = 300
export const BULK_ORDER_THRESHOLD = 10
export const QUANTITY_STORAGE_KEY_PREFIX = "quantity-"