import type { GuardName } from './guards'

export type LayoutName = 'landing' | 'app' | 'admin' | 'empty'

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key of the page title; rendered as "<title> · PrognoSports". */
    title?: string
    /** Breadcrumb i18n keys (painted by F3 `Breadcrumb`). */
    breadcrumb?: string[]
    layout?: LayoutName
    /** Guards this route needs; always evaluated in canonical order. Merged across nested routes. */
    guards?: GuardName[]
    /** Feature flag name (T6). When off the route answers 404 and its chunk is not downloaded. */
    flag?: string
  }
}
