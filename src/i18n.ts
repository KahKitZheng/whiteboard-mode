import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/whiteboard.json'
import nl from './locales/nl/whiteboard.json'

// `?lang=en` shows the English interface; Dutch is what a teacher gets.
const lang = new URLSearchParams(window.location.search).get('lang') ?? 'nl'

i18next.use(initReactI18next).init({
  resources: { nl: { whiteboard: nl }, en: { whiteboard: en } },
  lng: lang,
  fallbackLng: 'en',
  ns: ['whiteboard'],
  defaultNS: 'whiteboard',
  // Bundled resources: ready on the first render, no Suspense needed.
  initAsync: false,
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18next.language

export default i18next
