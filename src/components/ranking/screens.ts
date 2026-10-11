import { defineAsyncComponent, type Component } from 'vue'

/**
 * Screens of the ranking by mockup code (N3 `RankView.screen`). Every one is a lazy chunk, so a
 * screen behind a feature flag is never downloaded while the flag is off (router guard) and the
 * main bundle stays small (requisitos §18.3).
 */
const LOADERS: Record<string, () => Promise<Component>> = {
  R0: () => import('./R0Summary.vue'),
  R1: () => import('./R1Standings.vue'),
  R2: () => import('./R2Matrix.vue'),
  R3: () => import('./R3MySeason.vue'),
  R4: () => import('./R4Honours.vue'),
  R5: () => import('./R5Gap.vue'),
  R6: () => import('./R6Bump.vue'),
  R7: () => import('./R7Consistency.vue'),
  R8: () => import('./R8HeadToHead.vue'),
  R9: () => import('./R9Distribution.vue'),
  R10: () => import('./R10Heatmap.vue'),
  R11: () => import('./R11HitsByType.vue'),
  R12: () => import('./R12TitleRace.vue'),
  R13: () => import('./R13PointsBySession.vue'),
}

const cache = new Map<string, Component>()

export function screenComponent(code: string | undefined): Component | undefined {
  if (!code || !LOADERS[code]) return undefined
  let c = cache.get(code)
  if (!c) cache.set(code, (c = defineAsyncComponent(LOADERS[code])))
  return c
}

/** Screens that are useful with no GP played yet (the next GP, the previous seasons). */
export const EMPTY_OK: ReadonlySet<string> = new Set(['R0', 'R4'])
