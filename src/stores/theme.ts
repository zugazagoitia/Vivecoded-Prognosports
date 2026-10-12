import { ref } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS, readStorage, writeStorage } from './storage'

export type ThemeMode = 'light' | 'dark' | 'system'
const MODES: readonly string[] = ['light', 'dark', 'system']

export const useThemeStore = defineStore('theme', () => {
  const stored = readStorage(STORAGE_KEYS.theme)
  const mode = ref<ThemeMode>(stored && MODES.includes(stored) ? (stored as ThemeMode) : 'system')

  function prefersDark(): boolean {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  }

  /** Applies the `dark` class and `data-theme` on <html>. */
  function apply(): void {
    const root = globalThis.document?.documentElement
    if (!root) return
    const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark())
    root.classList.toggle('dark', dark)
    root.dataset.theme = dark ? 'dark' : 'light'
  }

  function set(next: ThemeMode): void {
    mode.value = next
    writeStorage(STORAGE_KEYS.theme, next)
    apply()
  }

  /** Applies the stored theme and follows OS changes while in `system`. */
  function init(): void {
    apply()
    globalThis.addEventListener?.('storage', onStorage)
    globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') apply()
    })
  }

  /** Follows theme changes made in other tabs (the `storage` event only fires in the others). */
  function onStorage(e: StorageEvent): void {
    if (e.key !== STORAGE_KEYS.theme) return
    mode.value = e.newValue && MODES.includes(e.newValue) ? (e.newValue as ThemeMode) : 'system'
    apply()
  }

  return { mode, set, apply, init }
})
