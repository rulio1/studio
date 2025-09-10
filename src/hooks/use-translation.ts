
'use client';

import { useUserStore } from '@/store/user-store';
import pt from '@/locales/pt.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import de from '@/locales/de.json';

const translations = { pt, en, es, de };

// Helper type to get all dot-notation keys from an object
type Path<T> = T extends object ? { [K in keyof T]:
    `${Exclude<K, symbol>}${"" | `.${Path<T[K]>}`}`
}[keyof T] : never;

type TranslationKey = Path<typeof pt>;

export const useTranslation = () => {
  const { language } = useUserStore();
  
  const t = (key: TranslationKey, variables?: Record<string, string>) => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            // Fallback to the key itself if not found
            return key;
        }
    }

    if (typeof result === 'string' && variables) {
      return Object.entries(variables).reduce((acc, [varKey, varValue]) => {
        return acc.replace(`{${varKey}}`, varValue);
      }, result);
    }
    
    return result;
  };
  
  return { t, language };
};
