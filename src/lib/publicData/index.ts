import { createJolpicaProvider } from './jolpica'
import { createOpenF1Provider } from './openf1'
import {
  PublicDataError,
  type PublicDataProvider,
  type PublicSessionData,
  type SessionRequest,
} from './types'

export type {
  PublicDataProvider,
  PublicDataSource,
  PublicSessionData,
  PublicSessionEntry,
  SessionKind,
  SessionRequest,
} from './types'
export { PublicDataError } from './types'

export interface FetchPublicSessionOptions {
  signal?: AbortSignal
  /** Tried in order; defaults to Jolpica then OpenF1. */
  providers?: readonly PublicDataProvider[]
}

const isAbort = (error: unknown) => error instanceof PublicDataError && error.code === 'aborted'

/** Jolpica first; OpenF1 only if Jolpica fails. Aborts never fall through to the next source. */
export async function fetchPublicSession(
  request: SessionRequest,
  {
    signal,
    providers = [createJolpicaProvider(), createOpenF1Provider()],
  }: FetchPublicSessionOptions = {},
): Promise<PublicSessionData> {
  const failures: unknown[] = []
  for (const provider of providers) {
    if (signal?.aborted) throw new PublicDataError('aborted', 'Request aborted')
    try {
      return await provider.fetchSession(request, signal)
    } catch (error) {
      if (isAbort(error) || signal?.aborted) throw error
      failures.push(error)
    }
  }
  throw new AggregateError(failures, 'No public data source could provide this session')
}
