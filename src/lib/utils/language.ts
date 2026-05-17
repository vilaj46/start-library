import { franc } from "franc";

export const isEnglish = (text: string): boolean => {
    if (!text || text.length < 20) return true;
    const langCode = franc(text);
    return langCode === 'eng';
};

export const hasNonLatinScripts = (text: string): boolean => {
    const nonLatinRegex = /[^\x00-\xFF\u2000-\u206F\u2070-\u209F\u2200-\u22FF\u2100-\u214F]/;
    return nonLatinRegex.test(text);
};
