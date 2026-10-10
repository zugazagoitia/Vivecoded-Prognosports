import { createI18n } from 'vue-i18n'
import common from './es/common.json'
import errors from './es/errors.json'
import sessions from './es/sessions.json'
import states from './es/states.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'es',
  messages: { es: { ...common, errors, sessions, states } },
})

export const t = i18n.global.t
