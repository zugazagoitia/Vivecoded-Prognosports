import { computed, ref, type ComputedRef } from 'vue'

/** Optional-statistics feature flags (requisitos §18, T6). Key = name without the VITE_FF_ prefix. */
export const FLAG_DEFS = {
  MY_SEASON: { label: 'Mi temporada' },
  HONOURS: { label: 'Palmarés' },
  GAP: { label: 'Diferencia de puntos (Gap)' },
  BUMP: { label: 'Posición en la general (Bump)' },
  TITLE_RACE: { label: 'Lucha por el título' },
  CONSISTENCY: { label: 'Regularidad' },
  HEAD_TO_HEAD: { label: 'Cara a cara' },
  DISTRIBUTION: { label: 'Distribución de puntos' },
  HEATMAP: { label: 'Mapa de calor por GP' },
  HITS_BY_TYPE: { label: 'Aciertos por tipo' },
  POINTS_BY_SESSION: { label: 'Puntos por sesión' },
  COMMUNITY_PERCENTILE: { label: 'Percentil entre comunidades' },
} as const

export type FlagName = keyof typeof FLAG_DEFS
export const FLAG_NAMES = Object.keys(FLAG_DEFS) as FlagName[]
export const envKey = (name: FlagName): string => `VITE_FF_${name}`
export const STORAGE_KEY = 'prognosports:flags'

export function isFlagName(name: string): name is FlagName {
  return Object.hasOwn(FLAG_DEFS, name)
}

type EnvLike = Record<string, string | undefined>
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export interface FlagsOptions {
  env?: EnvLike
  /** Vite mode. Overrides from storage only apply when it is not 'production'. */
  mode?: string
  storage?: StorageLike | null
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Only the literal string "true" turns a flag on; absent or anything else is off. */
function fromEnv(env: EnvLike, name: FlagName): boolean {
  return (env[envKey(name)] ?? '').toLowerCase() === 'true'
}

export function createFlags(opts: FlagsOptions = {}) {
  const env = opts.env ?? import.meta.env
  const mode = opts.mode ?? import.meta.env.MODE
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage
  const overridable = mode !== 'production'

  function readOverrides(): Partial<Record<FlagName, boolean>> {
    if (!overridable || !storage) return {}
    try {
      const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
      if (typeof parsed !== 'object' || parsed === null) return {}
      const out: Partial<Record<FlagName, boolean>> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (isFlagName(k) && typeof v === 'boolean') out[k] = v
      }
      return out
    } catch {
      return {}
    }
  }

  const overrides = ref(readOverrides())

  function isEnabled(name: string): boolean {
    if (!isFlagName(name)) return false
    return overrides.value[name] ?? fromEnv(env, name)
  }

  function setOverride(name: FlagName, value: boolean): void {
    if (!overridable) return
    overrides.value = { ...overrides.value, [name]: value }
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(overrides.value))
    } catch {
      // Storage unavailable: the override lives only for this session.
    }
  }

  function useFlag(name: FlagName): ComputedRef<boolean> {
    return computed(() => isEnabled(name))
  }

  return { isEnabled, setOverride, useFlag }
}

/** True in previews of PRs (VITE_PREVIEW=true) and in development; never in production. */
export function isPreviewEnv(env: EnvLike = import.meta.env, mode = import.meta.env.MODE): boolean {
  if (mode === 'production') return false
  return mode === 'development' || env.VITE_PREVIEW === 'true'
}

const instance = createFlags()
export const isEnabled = instance.isEnabled
export const setFlagOverride = instance.setOverride
export const useFlag = instance.useFlag
