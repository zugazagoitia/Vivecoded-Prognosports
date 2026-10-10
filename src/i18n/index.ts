import { createI18n } from 'vue-i18n'
import register from './es/register.json'
import admin from './es/admin.json'
import auth from './es/auth.json'
import circuits from './es/circuits.json'
import common from './es/common.json'
import data from './es/data.json'
import errors from './es/errors.json'
import legal from './es/legal.json'
import faq from './es/faq.json'
import gps from './es/gps.json'
import landing from './es/landing.json'
import mobilenav from './es/mobilenav.json'
import nav from './es/nav.json'
import recover from './es/recover.json'
import reset from './es/reset.json'
import sessions from './es/sessions.json'
import rules from './es/rules.json'
import states from './es/states.json'
import ui from './es/ui.json'
import verify from './es/verify.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'es',
  messages: {
    es: {
      ...common,
      ...mobilenav,
      admin,
      ...register,
      ...auth,
      errors,
      ...legal,
      nav,
      sessions,
      data,
      states,
      ui,
      ...rules,
      ...circuits,
      faq,
      ...gps,
      ...landing,
      ...recover,
      ...reset,
      ...verify,
    },
  },
})

export const t = i18n.global.t
