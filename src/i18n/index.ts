import { createI18n } from 'vue-i18n'
import register from './es/register.json'
import account from './es/account.json'
import admin from './es/admin.json'
import auth from './es/auth.json'
import circuits from './es/circuits.json'
import community from './es/community.json'
import communitySettings from './es/community-settings.json'
import common from './es/common.json'
import communities from './es/communities.json'
import createCommunity from './es/createCommunity.json'
import consensus from './es/consensus.json'
import data from './es/data.json'
import errors from './es/errors.json'
import explore from './es/explore.json'
import legal from './es/legal.json'
import faq from './es/faq.json'
import gps from './es/gps.json'
import home from './es/home.json'
import gp from './es/gp.json'
import invitation from './es/invitation.json'
import landing from './es/landing.json'
import mobilenav from './es/mobilenav.json'
import nav from './es/nav.json'
import predict from './es/predict.json'
import ranking from './es/ranking.json'
import profile from './es/profile.json'
import recover from './es/recover.json'
import reset from './es/reset.json'
import results from './es/results.json'
import sessions from './es/sessions.json'
import simulator from './es/simulator.json'
import rules from './es/rules.json'
import states from './es/states.json'
import ui from './es/ui.json'
import userProfile from './es/userProfile.json'
import verify from './es/verify.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'es',
  messages: {
    es: {
      ...account,
      ...common,
      ...mobilenav,
      ...communities,
      ...explore,
      admin,
      ...register,
      ...auth,
      errors,
      ...legal,
      nav,
      predict,
      sessions,
      consensus,
      ...createCommunity,
      data,
      states,
      ui,
      ...rules,
      ...circuits,
      ...community,
      ...communitySettings,
      faq,
      ...gps,
      home,
      ...gp,
      ...invitation,
      ...landing,
      ...profile,
      ...ranking,
      ...recover,
      ...reset,
      ...results,
      ...simulator,
      userProfile,
      ...verify,
    },
  },
})

export const t = i18n.global.t
