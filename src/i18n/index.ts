// import i18next from 'i18next';
// import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector';
// import en from './locales/en';
// import fr from './locales/fr';
// import kn from './locales/kn';
// import dayjs from 'dayjs';
// import 'dayjs/locale/en';
// import 'dayjs/locale/fr';
// import 'dayjs/locale/kn';

// i18next
//   .use(LanguageDetector)
//   .use(initReactI18next)
//   .init({
//     resources: {
//       en,
//       fr,
//       kn
//     },
//     fallbackLng: 'en',
//     interpolation: {
//       escapeValue: false,
//     },
//   });

// // Update dayjs locale when i18n language changes
// i18next.on('languageChanged', (lng) => {
//   dayjs.locale(lng);
// });

// export default i18next;



// This is using .json files instead of .ts - while above part works for .ts files
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/kn'; // kannada
import 'dayjs/locale/ta'; // Tamil
import 'dayjs/locale/kn'; // Kannada
import 'dayjs/locale/te'; // Telugu
import 'dayjs/locale/mr'; // Marathi
import 'dayjs/locale/hi'; // Hindi

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en.translation },
      fr: { translation: fr.translation },
      hi: { translation: hi.translation },
      mr: { translation: mr.translation },
      kn: { translation: kn.translation },
      te: { translation: te.translation },
      ta: { translation: ta.translation },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Update dayjs locale when i18n language changes
i18next.on('languageChanged', (lng) => {
  dayjs.locale(lng);
});

export default i18next;