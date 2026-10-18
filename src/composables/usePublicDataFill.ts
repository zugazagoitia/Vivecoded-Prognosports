import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { deriveGrid, deriveResults } from '@/lib/publicData/derive'
import type { DriverRef, SessionResultKind } from '@/lib/publicData/mapping'
import type {
  PublicDataSource,
  PublicSessionEntry,
  SessionKind,
  SessionRequest,
} from '@/lib/publicData/types'
import { usePublicSession } from '@/queries/publicData'

/**
 * «Rellenar con datos públicos» (admin): fetches the public data of a session only when asked,
 * and derives a proposal for the grid or the results. It never touches the form: the caller
 * applies the proposal (local rows, so they become unsaved changes).
 */

export type PublicDataMode = 'grid' | 'results'

export interface PublicProposal {
  /** Driver id per position (index 0 = P1), `slots` long; null where no app driver matches. */
  driverIds: (number | null)[]
  /** Pit-lane starts per position (grid only). */
  isFromPit: boolean[]
  /** Fastest lap driver id (results only). */
  fastLap: number | null
  /** Public entries with no app driver. */
  unmatched: PublicSessionEntry[]
  source: PublicDataSource
  fetchedAt: string
}

export type PublicDataState = 'idle' | 'loading' | 'error' | 'empty' | 'preview'

export interface PublicDataFillOptions {
  mode: PublicDataMode
  season: MaybeRefOrGetter<number | undefined>
  round: MaybeRefOrGetter<number | undefined>
  /** Kind of the app session (from its code); null when the app does not map it. */
  resultKind: MaybeRefOrGetter<SessionResultKind | null>
  drivers: MaybeRefOrGetter<readonly DriverRef[]>
  /** Number of positions the form has. */
  slots: MaybeRefOrGetter<number>
}

const SESSION_KIND: Record<SessionResultKind, SessionKind> = {
  results: 'race',
  qualifying: 'qualifying',
  sprint: 'sprint',
}

export function usePublicDataFill(options: PublicDataFillOptions) {
  const requested = ref(false)

  // Grids start from the race (or sprint) order and fall back to the qualifying order.
  const kind = computed<SessionKind | null>(() => {
    const k = toValue(options.resultKind)
    if (options.mode === 'grid') return k === 'sprint' ? 'sprint' : 'race'
    return k ? SESSION_KIND[k] : null
  })

  const build = (k: SessionKind | null): SessionRequest | undefined => {
    const season = toValue(options.season)
    const round = toValue(options.round)
    if (!requested.value || !k || season == null || round == null) return undefined
    return { season, round, kind: k }
  }
  const primaryRequest = computed(() => build(kind.value))
  const fallbackRequest = computed(() =>
    options.mode === 'grid' ? build('qualifying') : undefined,
  )

  const primary = usePublicSession(primaryRequest)
  const fallback = usePublicSession(fallbackRequest)

  const failed = computed(
    () =>
      requested.value &&
      (primary.isError.value || (fallback.isError.value && primary.data.value == null)),
  )
  const loading = computed(
    () =>
      requested.value &&
      !failed.value &&
      (primary.isFetching.value || (fallback.isFetching.value && primary.data.value == null)),
  )

  const proposal = computed<PublicProposal | null>(() => {
    const data = primary.data.value
    if (!data) return null
    const slots = toValue(options.slots)
    const drivers = toValue(options.drivers)
    const pad = <T>(values: readonly T[], fill: T): T[] =>
      Array.from({ length: slots }, (_, i) => values[i] ?? fill)
    if (options.mode === 'grid') {
      const sprint = kind.value === 'sprint'
      const derived = deriveGrid(
        sprint ? 'sprint' : 'race',
        {
          race: sprint ? undefined : data.entries,
          sprint: sprint ? data.entries : undefined,
          qualifying: fallback.data.value?.entries,
        },
        drivers,
      )
      return {
        driverIds: pad(
          derived.rows.map((r) => r.driverId),
          null,
        ),
        isFromPit: pad(
          derived.rows.map((r) => r.isFromPit),
          false,
        ),
        fastLap: null,
        unmatched: derived.unmatched,
        source: data.source,
        fetchedAt: data.fetchedAt,
      }
    }
    const derived = deriveResults(data.entries, drivers)
    return {
      driverIds: pad(derived.rows, null),
      isFromPit: [],
      fastLap: derived.fastLap,
      unmatched: derived.unmatched,
      source: data.source,
      fetchedAt: data.fetchedAt,
    }
  })

  const state = computed<PublicDataState>(() => {
    if (!requested.value) return 'idle'
    if (failed.value) return 'error'
    if (loading.value) return 'loading'
    if (!proposal.value || primary.data.value?.entries.length === 0) return 'empty'
    return 'preview'
  })

  function open() {
    requested.value = true
  }
  function close() {
    requested.value = false
  }
  /** Retries after a failure; the form is never touched here. */
  function retry() {
    void primary.refetch()
    if (fallbackRequest.value) void fallback.refetch()
  }

  return { requested, open, close, retry, state, proposal }
}
