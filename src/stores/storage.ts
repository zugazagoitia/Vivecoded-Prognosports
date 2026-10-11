/** localStorage access that never throws (private mode, blocked storage, SSR/tests). */
export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, value)
  } catch {
    // Storage unavailable: the value just will not survive a reload.
  }
}

export const STORAGE_KEYS = {
  token: 'prognosports:token',
  community: 'prognosports:community',
  theme: 'prognosports:theme',
} as const
