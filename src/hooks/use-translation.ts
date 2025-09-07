
'use client';

import { useUserStore } from '@/store/user-store';
import pt from '@/locales/pt.json';
import en from '@/locales/en.json';

const translations = { pt, en };

// Helper type to get all dot-notation keys from an object
type Path<T> = T extends object ? { [K in keyof T]:
    `${Exclude<K, symbol>}${"" | `.${Path<T[K]>}`}`
}[keyof T] : never;

type TranslationKey = Path<typeof pt>;

export const useTranslation = () => {
  const { language } = useUserStore();
  
  const t = (key: TranslationKey) => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            // Fallback to the key itself if not found
            return key;
        }
    }
    return result;
  };
  
  return { t, language };
};
