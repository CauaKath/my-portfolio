import { createI18n } from 'vue-i18n'

import en from './locales/en'
import ptBR from './locales/pt-BR'

export const LOCALES = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'locale'

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

// Saved choice first, then the browser's language, then English.
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (isLocale(saved)) return saved
  } catch {
    // Storage can be blocked; fall through to the browser language.
  }

  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, 'pt-BR': ptBR },
})

// Browsers format dates with a region; bare "en" is fine for them but we pin
// US English so dates match what the site showed before i18n.
export function dateLocale(locale: string): string {
  return locale === 'pt-BR' ? 'pt-BR' : 'en-US'
}

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale

  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisting is acceptable; the choice still applies for this visit.
  }
}

document.documentElement.lang = i18n.global.locale.value
