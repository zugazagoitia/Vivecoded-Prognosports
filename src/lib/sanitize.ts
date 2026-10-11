import DOMPurify from 'dompurify'

/**
 * Sanitizes HTML coming from the API (requisitos §23.3). Strips `<script>`, `on*` handlers and
 * `javascript:` URLs. Prefer rendering text with `{{ }}`; use this only behind a `v-html`
 * exception comment (lint rule `vue/no-v-html`).
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } })
}
