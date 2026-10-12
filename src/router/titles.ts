import type { Router } from 'vue-router'
import { t } from '@/i18n'

/** Titles come from `src/i18n/es/routes.json` (`route.*`); the resolver can be swapped (tests). */
let resolve: (key: string) => string = (key) => t(key)

export function setTitleResolver(fn: (key: string) => string): void {
  resolve = fn
}

export const APP_NAME = 'PrognoSports'

export function installTitles(router: Router): void {
  router.afterEach((to) => {
    const key = to.meta.title
    document.title = key ? `${resolve(key)} · ${APP_NAME}` : APP_NAME
  })
}
