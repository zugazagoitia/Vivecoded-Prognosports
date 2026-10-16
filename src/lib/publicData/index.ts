import type { QueryClient } from '@tanstack/vue-query'
import { createJolpica } from './jolpica'
import { createOpenF1 } from './openf1'
import {
  isAbort,
  PublicDataEmptyError,
  PublicDataError,
  type PublicProvider,
  type PublicRequest,
  type PublicSessionData,
} from './types'

export * from './types'
export { diffs, gpWindow, matchDrivers, sessionKind, toPrefill } from './mapping'

/** Jolpica caches 10 min on its side; we keep the same TTL. */
export const PUBLIC_DATA_STALE_MS = 10 * 60_000

/** Tries each source in order (Jolpica, then OpenF1); the first with data wins. */
export async function loadPublicData(
  req: PublicRequest,
  signal?: AbortSignal,
  providers: PublicProvider[] = [createJolpica(), createOpenF1()],
): Promise<PublicSessionData> {
  let empty = false
  let last: unknown
  for (const p of providers) {
    try {
      return await p.load(req, signal)
    } catch (e) {
      if (isAbort(e)) throw e
      if (e instanceof PublicDataEmptyError) empty = true
      last = e
    }
  }
  if (empty) throw new PublicDataEmptyError()
  throw last instanceof PublicDataError ? last : new PublicDataError('Public data unavailable')
}

/** Same as `loadPublicData`, cached in TanStack Query (10 min) and abortable. */
export function fetchPublicData(
  qc: QueryClient,
  req: PublicRequest,
  signal?: AbortSignal,
): Promise<PublicSessionData> {
  return qc.fetchQuery({
    queryKey: ['public-data', req.purpose, req.kind, req.gp.year, req.gp.from],
    queryFn: ({ signal: s }) => loadPublicData(req, signal ?? s),
    staleTime: PUBLIC_DATA_STALE_MS,
    retry: false,
  })
}
