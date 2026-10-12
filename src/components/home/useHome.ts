import { inject, provide, reactive, type InjectionKey } from 'vue'
import { useNow } from '@/composables/useNow'
import { useHomeNext, useHomeScope, useHomeStanding } from '@/queries/home'

/**
 * Data of the home screen, created once by the page and injected by its blocks. Each block reads
 * only what it needs, so its loading / error states are independent (`next` and `standing`
 * are separate queries).
 */
export function createHome() {
  // A minute is the finest unit the countdown shows (and the rows change state on it).
  const now = useNow(30_000)
  const scope = useHomeScope()
  const next = useHomeNext(scope, now)
  const standing = useHomeStanding(scope)
  return reactive({ now, scope, next, standing })
}
export type Home = ReturnType<typeof createHome>

const KEY: InjectionKey<Home> = Symbol('home')

export function provideHome(home: Home): void {
  provide(KEY, home)
}

export function useHome(): Home {
  const home = inject(KEY)
  if (!home) throw new Error('useHome() needs a parent that called provideHome()')
  return home
}
