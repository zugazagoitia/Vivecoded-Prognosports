import { nextTick, ref } from 'vue'
import type { Router } from 'vue-router'

/** Text read by the `aria-live` region mounted in App.vue. */
export const announcement = ref('')

export function installFocusManagement(router: Router): void {
  let first = true
  router.afterEach(async (to, from, failure) => {
    if (failure) return
    await nextTick()
    // Don't steal focus on the initial load or on pure hash/query changes.
    if (first) {
      first = false
      announcement.value = document.title
      return
    }
    if (to.path === from.path) return
    const target =
      document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
    // Clear first so repeated identical titles are still announced.
    announcement.value = ''
    await nextTick()
    announcement.value = document.title
  })
}
