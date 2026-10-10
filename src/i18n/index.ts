import { createI18n } from 'vue-i18n'
import admin from './es/admin.json'
import circuits from './es/circuits.json'
import common from './es/common.json'
import data from './es/data.json'
import errors from './es/errors.json'
import legal from './es/legal.json'
import mobilenav from './es/mobilenav.json'
import nav from './es/nav.json'
import sessions from './es/sessions.json'
import rules from './es/rules.json'
import states from './es/states.json'
import ui from './es/ui.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'es',
  messages: {
    es: {
      ...common,
      ...mobilenav,
      admin,
      errors,
      ...legal,
      nav,
      sessions,
      data,
      states,
      ui,
      ...rules,
      ...circuits,
    },
  },
})

export const t = i18n.global.t
