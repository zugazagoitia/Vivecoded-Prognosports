import { createI18n } from 'vue-i18n'
import common from './es/common.json'
import sessions from './es/sessions.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'es',
  messages: { es: { ...common, sessions } },
})

export const t = i18n.global.t
