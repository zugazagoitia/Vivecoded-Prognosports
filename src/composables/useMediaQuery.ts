import { onScopeDispose, ref, type Ref } from 'vue'

/**
 * Reactive `matchMedia`. Where it does not exist (jsdom) the query never matches, so the desktop
 * layout is the default in unit tests.
 */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false)
  if (typeof globalThis.matchMedia !== 'function') return matches
  const list = globalThis.matchMedia(query)
  matches.value = list.matches
  const onChange = (e: MediaQueryListEvent) => {
    matches.value = e.matches
  }
  list.addEventListener('change', onChange)
  onScopeDispose(() => list.removeEventListener('change', onChange))
  return matches
}

/** Phone layout of the app (the `md` breakpoint: bottom tab bar instead of the top menu). */
export const MOBILE_QUERY = '(max-width: 767px)'
