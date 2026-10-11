import { inject, provide, reactive, type InjectionKey } from 'vue'
import { createProfile } from '@/queries/profile'

/** Data of «Mi perfil», created once by the page and injected by its blocks (like the home). */
export function createProfileState() {
  return reactive(createProfile())
}
export type ProfileState = ReturnType<typeof createProfileState>

const KEY: InjectionKey<ProfileState> = Symbol('profile')

export function provideProfile(p: ProfileState): void {
  provide(KEY, p)
}

export function useProfile(): ProfileState {
  const p = inject(KEY)
  if (!p) throw new Error('useProfile() needs a parent that called provideProfile()')
  return p
}
