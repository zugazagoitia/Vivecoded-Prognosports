import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { ApiError, catalogApi, communitiesApi, gpsApi, type GrandPrix } from '@/api'
import type { Prediction, RaceSession } from '@/api/schemas'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'
import { useSeasonGps } from './circuits'

type Id = string | number

/**
 * Queries of a Grand Prix weekend (G2). They take the route params (`competicion`, `temporada`,
 * `gp`, `sesion`) as getters and are reused by the predict (G3), grid/consensus (G4) and
 * results (G5) screens. Everything except `useGpDetail` needs a session and an active community.
 */

export interface GpArgs {
  competition: Id
  season: Id
  gp: Id
}

/** Signed-in user id and active community id (undefined until both are known). */
export function useActor() {
  const session = useSessionStore()
  const community = useCommunityStore()
  return {
    userId: computed(() => session.user?.id),
    communityId: computed(() => community.activeId ?? undefined),
    members: computed(() => community.active?.membersAmount),
    ready: computed(() => session.isAuthenticated && community.activeId != null),
  }
}

/** The list endpoint is the only one whose items carry name, code and `round` for neighbours. */
export function sortByRound(gps: readonly GrandPrix[]): GrandPrix[] {
  return [...gps].sort((a, b) => (a.round ?? 1e9) - (b.round ?? 1e9))
}

/** Matches the `:gp` param by id (links) or by code (`SIN`). */
export function findGp(gps: readonly GrandPrix[], param: string): GrandPrix | undefined {
  return (
    gps.find((g) => String(g.id) === param) ??
    gps.find((g) => (g.code ?? '').toLowerCase() === param.toLowerCase())
  )
}

/**
 * Grand Prix of the URL plus its previous/next in the season. Built from the season list
 * (`GET /v2/gps/{competition}/{season}`, public, shared with the calendar): `GET .../{gp}` also
 * exists but its `previousGrandPrix`/`nextGrandPrix` only carry an id, so the list is needed
 * anyway. Public data: works without a session.
 */
export function useGpDetail(
  competition: MaybeRefOrGetter<Id>,
  season: MaybeRefOrGetter<Id>,
  gp: MaybeRefOrGetter<string>,
) {
  const list = useSeasonGps(competition, season)
  const ordered = computed(() => sortByRound(list.data.value ?? []))
  const current = computed(() => (list.data.value ? findGp(ordered.value, toValue(gp)) : undefined))
  const index = computed(() => ordered.value.findIndex((g) => g.id === current.value?.id))
  const err = list.error
  /** Unknown ids answer 200 with `success:false`; an id missing from the list is also a 404. */
  const notFound = computed(
    () =>
      (list.isSuccess.value && !current.value) ||
      (err.value instanceof ApiError &&
        err.value.kind === 'http' &&
        err.value.status < 500 &&
        ![401, 403].includes(err.value.status)),
  )
  return {
    gp: current,
    previous: computed(() => (index.value > 0 ? ordered.value[index.value - 1] : undefined)),
    next: computed(() => (index.value >= 0 ? ordered.value[index.value + 1] : undefined)),
    totalRounds: computed(() => current.value?.season?.totalEvents ?? ordered.value.length),
    isLoading: list.isLoading,
    isError: computed(() => list.isError.value && !notFound.value),
    notFound,
    error: err,
    refetch: () => list.refetch(),
  }
}

const sessionEnabled = (
  ready: MaybeRefOrGetter<boolean>,
  a: MaybeRefOrGetter<GpArgs | undefined>,
  s: MaybeRefOrGetter<Id | undefined>,
  extra: MaybeRefOrGetter<boolean> = true,
) => computed(() => toValue(ready) && toValue(a) != null && toValue(s) != null && toValue(extra))

/** Results of a session (`position = 0` rows are the fastest lap: filter with `onlyClassified`). */
export function useSessionResults(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.results(
        a?.competition ?? '',
        a?.season ?? '',
        a?.gp ?? '',
        toValue(session) ?? '',
      )
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.getResults(a.competition, a.season, a.gp, toValue(session)!, signal)
    },
    enabled: sessionEnabled(actor.ready, args, session, enabled),
  })
}

/** Start grid of a session (the one that HAS the grid: see `gridSessionFor`). */
export function useSessionGrid(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.grid(a?.competition ?? '', a?.season ?? '', a?.gp ?? '', toValue(session) ?? '')
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.getGrid(a.competition, a.season, a.gp, toValue(session)!, signal)
    },
    enabled: sessionEnabled(actor.ready, args, session),
  })
}

function tippsOptions(
  actor: ReturnType<typeof useActor>,
  a: GpArgs | undefined,
  session: Id | undefined,
) {
  return {
    queryKey: keys.tipps(
      actor.communityId.value ?? '',
      a?.competition ?? '',
      a?.season ?? '',
      a?.gp ?? '',
      session ?? '',
    ),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      gpsApi.getTipps(a!.competition, a!.season, a!.gp, session!, actor.communityId.value!, signal),
    enabled: actor.ready.value && a != null && session != null,
  }
}

/**
 * Predictions returned by `GET .../tipps/{community}`: the user's own, plus (after closing, 6.8)
 * everyone's. Use `mine` for the user's and `all` for the consensus; the key is the one G3/G4 use.
 */
export function useSessionTipps(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
) {
  const actor = useActor()
  const q = useQuery({
    queryKey: computed(() => tippsOptions(actor, toValue(args), toValue(session)).queryKey),
    queryFn: ({ signal }) =>
      tippsOptions(actor, toValue(args), toValue(session)).queryFn({ signal }),
    enabled: computed(() => tippsOptions(actor, toValue(args), toValue(session)).enabled),
  })
  const mine = computed(() => mineOf(q.data.value, actor.userId.value))
  return Object.assign(q, { mine })
}

/** The user's own rows (rows without `user` are the caller's by definition of the endpoint). */
export function mineOf<T extends { user?: { id: number } | null }>(
  all: readonly T[] | undefined,
  userId: number | undefined,
): T[] {
  return (all ?? []).filter((p) => p.user == null || userId == null || p.user.id === userId)
}

/** Points per predicted position of the user in a scored session (8.11 `calculations`). */
export function useSessionCalculations(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  session: MaybeRefOrGetter<Id | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.tipps(
        actor.communityId.value ?? '',
        a?.competition ?? '',
        a?.season ?? '',
        a?.gp ?? '',
        toValue(session) ?? '',
        'calculations',
      )
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return gpsApi.getCalculations(
        a.competition,
        a.season,
        a.gp,
        toValue(session)!,
        actor.communityId.value!,
        signal,
      )
    },
    enabled: sessionEnabled(actor.ready, args, session, enabled),
  })
}

/**
 * Per-session data of the weekend for the timeline: the user's predictions of every session and
 * the results of the closed ones (a session is «scored» when it has classified results).
 * Results are requested only for sessions listed in `closedIds`.
 */
export function useWeekendSessions(
  args: MaybeRefOrGetter<GpArgs | undefined>,
  sessions: MaybeRefOrGetter<readonly RaceSession[]>,
  closedIds: MaybeRefOrGetter<readonly number[]>,
) {
  const actor = useActor()
  const tipps = useQueries({
    queries: computed(() => toValue(sessions).map((s) => tippsOptions(actor, toValue(args), s.id))),
  })
  const results = useQueries({
    queries: computed(() =>
      toValue(sessions).map((s) => {
        const a = toValue(args)
        return {
          queryKey: keys.results(a?.competition ?? '', a?.season ?? '', a?.gp ?? '', s.id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            gpsApi.getResults(a!.competition, a!.season, a!.gp, s.id, signal),
          enabled: actor.ready.value && a != null && toValue(closedIds).includes(s.id),
        }
      }),
    ),
  })
  return {
    /** Predictions of the user per session id (undefined while loading). */
    mine: computed(() => {
      const out = new Map<number, Prediction[]>()
      toValue(sessions).forEach((s, i) => {
        const data = tipps.value[i]?.data
        if (data) out.set(s.id, mineOf(data, actor.userId.value))
      })
      return out
    }),
    /** Whether classified results exist, per closed session id. */
    hasResults: computed(() => {
      const out = new Map<number, boolean>()
      toValue(sessions).forEach((s, i) => {
        const data = results.value[i]?.data
        if (data)
          out.set(
            s.id,
            data.some((r) => r.position > 0),
          )
      })
      return out
    }),
    isLoading: computed(() => [...tipps.value, ...results.value].some((q) => q.isLoading)),
    isError: computed(() => tipps.value.some((q) => q.isError)),
    error: computed(() => tipps.value.find((q) => q.isError)?.error ?? null),
    refetch: () => Promise.all(tipps.value.filter((q) => q.isError).map((q) => q.refetch())),
  }
}

/** Community points of every member in a GP (`UserPoints[]`); shares the key of `useGpPointsList`. */
export function useGpCommunityPoints(args: MaybeRefOrGetter<GpArgs | undefined>) {
  const actor = useActor()
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return [
        ...keys.points(actor.communityId.value ?? '', a?.competition ?? '', a?.season ?? ''),
        'gp',
        a?.gp ?? '',
      ] as const
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return communitiesApi.getCommunityPointsInGp(
        actor.communityId.value!,
        a.competition,
        a.season,
        a.gp,
        signal,
      )
    },
    enabled: computed(() => actor.ready.value && toValue(args) != null),
  })
}

/** Rule set applied to the GP, and the one applied to the season (differ = GP exception). */
export function useGpRulesets(args: MaybeRefOrGetter<GpArgs | undefined>) {
  const actor = useActor()
  const enabled = computed(() => actor.ready.value && toValue(args) != null)
  const forGp = useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.ruleset(
        actor.communityId.value ?? '',
        a?.competition ?? '',
        a?.season ?? '',
        a?.gp ?? '',
      )
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return catalogApi.getCommunityGpRuleset(
        actor.communityId.value!,
        a.competition,
        a.season,
        a.gp,
        signal,
      )
    },
    enabled,
  })
  const forSeason = useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.ruleset(actor.communityId.value ?? '', a?.competition ?? '', a?.season ?? '')
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)!
      return catalogApi.getCommunityRuleset(
        actor.communityId.value!,
        a.competition,
        a.season,
        signal,
      )
    },
    enabled,
  })
  return { forGp, forSeason }
}
