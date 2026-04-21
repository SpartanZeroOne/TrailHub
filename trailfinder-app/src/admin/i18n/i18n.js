import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const STORAGE_KEY = 'trailhub_admin_lang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: localStorage.getItem(STORAGE_KEY) ?? 'de',
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
