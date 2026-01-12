import enTranslations from './en.json';
import frTranslations from './fr.json';

export const translations = {
  en: enTranslations,
  fr: frTranslations,
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof enTranslations;

export function useTranslations(lang: Language) {
  return translations[lang];
}

// Helper function to get nested translation value
export function getTranslation(
  translations: any,
  key: string
): string {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return the key itself if not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}
