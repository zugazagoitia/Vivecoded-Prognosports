import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery, useQueries } from '@tanstack/vue-query'
import { communitiesApi, gpsApi } from '@/api'
import type { Season } from '@/api/schemas'
import { gpShortName } from '@/lib/gp'
import { seasonSortKey } from '@/lib/community'
import { buildRanking, type RankModel } from '@/lib/ranking'
import { buildMedals, type SeasonStanding } from '@/lib/rankingStats'
import { useSessionStore } from '@/stores/session'
import { useSeasonGps } from './circuits'
import {
  useCommunityDetail,
  useCommunityMembers,
  useSeasonPoints,
  type SeasonArgs,
} from './community'
import { useMyCommunities } from './communities'
import { useCompetitionSeasons } from './gps'
import { keys } from './keys'

type Id = string | number

/**
 * Season of the route: `:temporada` is a season id (what RankNav puts in the URL) or its name
 * («2026»). Unknown values resolve to `undefined` (the page then shows the not-found state).
 */
export function resolveSeason(
  param: string,
  seasons: readonly Pick<Season, 'id' | 'name'>[] | undefined,
): Pick<Season, 'id' | 'name'> | undefined {
  return seasons?.find((s) => String(s.id) === param) ?? seasons?.find((s) => s.name === param)
}

/**
 * Everything the ranking screens share (R0-R13): the community, its competition seasons, the
 * season calendar, the points of the whole season (ONE request, `…/{season}/points`) and the
 * members, combined into the `RankModel`. Each screen only reads the model, so switching view
 * never repeats a request (TanStack Query keys are shared with the community page, H5).
 */
export function useRanking(
  communityId: MaybeRefOrGetter<Id>,
  seasonParam: MaybeRefOrGetter<string>,
) {
  const session = useSessionStore()
  const detail = useCommunityDetail(communityId)
  const competition = computed(() => detail.data.value?.competition?.id)
  const seasons = useCompetitionSeasons(competition)
  const season = computed(() => resolveSeason(toValue(seasonParam), seasons.data.value))
  const args = computed<SeasonArgs>(() => ({
    community: toValue(communityId),
    competition: competition.value,
    season: season.value?.id,
  }))
  const points = useSeasonPoints(args)
  const members = useCommunityMembers(communityId)
  const gps = useSeasonGps(
    () => competition.value ?? '',
    () => season.value?.id,
  )
  const communities = useMyCommunities()

  const model = computed<RankModel | undefined>(() => {
    if (!points.data.value || !members.data.value || !gps.data.value) return undefined
    return buildRanking({
      points: points.data.value,
      gps: gps.data.value,
      members: members.data.value,
      userId: session.user?.id,
      gpName: gpShortName,
    })
  })

  // `…/points` can come back empty (`{}`); then the totals give a degraded final table.
  const pointsEmpty = computed(
    () => points.data.value != null && Object.keys(points.data.value).length === 0,
  )
  const totals = useQuery({
    queryKey: computed(() => {
      const a = args.value
      return keys.totals(a.community, a.competition ?? '', a.season ?? '')
    }),
    queryFn: ({ signal }) => {
      const a = args.value
      return communitiesApi.getSeasonTotals(a.community, a.competition!, a.season!, signal)
    },
    enabled: computed(() => pointsEmpty.value && season.value != null),
  })

  const queries = [detail, seasons, points, members, gps] as const
  const total = computed(() =>
    season.value && seasons.data.value
      ? (seasons.data.value.find((s) => s.id === season.value!.id)?.totalEvents ??
        model.value?.calendar.length ??
        0)
      : (model.value?.calendar.length ?? 0),
  )
  return {
    detail,
    seasons,
    season,
    args,
    points,
    totals,
    members,
    gps,
    communities,
    model,
    competition,
    total,
    /** Unknown community (HTTP 200 + `success:false`) or season. */
    notFound: computed(
      () => detail.notFound.value || (seasons.isSuccess.value && season.value === undefined),
    ),
    notMember: detail.notMember,
    isLoading: computed(() => queries.some((q) => q.isLoading.value)),
    error: computed(() => queries.find((q) => q.isError.value)?.error.value ?? null),
    refetch: () => Promise.all(queries.filter((q) => q.isError.value).map((q) => q.refetch())),
  }
}

export type Ranking = ReturnType<typeof useRanking>

/**
 * Ids of the competition seasons in which the community has points (RankNav selector). Shares the
 * `…/points` queries with R4; `undefined` while any of them is still loading.
 */
export function useSeasonsWithPoints(args: MaybeRefOrGetter<SeasonArgs>) {
  const seasons = useCompetitionSeasons(() => toValue(args).competition)
  const list = computed(() => seasons.data.value ?? [])
  const pointQueries = useQueries({
    queries: computed(() =>
      list.value.map((s) => ({
        queryKey: keys.points(toValue(args).community, toValue(args).competition ?? '', s.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          communitiesApi.getCommunityPoints(
            toValue(args).community,
            toValue(args).competition!,
            s.id,
            signal,
          ),
      })),
    ),
  })
  return computed<Set<number | string> | undefined>(() => {
    if (!seasons.isSuccess.value || pointQueries.value.some((q) => q.isLoading)) return undefined
    return new Set(
      list.value
        .filter((_, i) => Object.keys(pointQueries.value[i]?.data ?? {}).length > 0)
        .map((s) => s.id),
    )
  })
}

/**
 * R4: final table of every season of the competition in which the community has points.
 * One `…/points` request per season plus the season GP list of those that have points (to order
 * the GPs by round). `totaluserpoints` is NOT used: the real API keys it by username (README).
 */
export function useSeasonStandings(args: MaybeRefOrGetter<SeasonArgs>) {
  const session = useSessionStore()
  const seasons = useCompetitionSeasons(() => toValue(args).competition)
  const list = computed(() =>
    [...(seasons.data.value ?? [])].sort((a, b) => seasonSortKey(b) - seasonSortKey(a)),
  )
  const pointQueries = useQueries({
    queries: computed(() =>
      list.value.map((s) => ({
        queryKey: keys.points(toValue(args).community, toValue(args).competition ?? '', s.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          communitiesApi.getCommunityPoints(
            toValue(args).community,
            toValue(args).competition!,
            s.id,
            signal,
          ),
      })),
    ),
  })
  const withPoints = computed(() =>
    list.value.filter((_, i) => Object.keys(pointQueries.value[i]?.data ?? {}).length > 0),
  )
  const gpQueries = useQueries({
    queries: computed(() =>
      withPoints.value.map((s) => ({
        queryKey: keys.gps(toValue(args).competition ?? '', s.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          gpsApi.listGps(toValue(args).competition!, s.id, signal),
      })),
    ),
  })
  const rows = computed<SeasonStanding[]>(() => {
    const out: SeasonStanding[] = []
    withPoints.value.forEach((s, i) => {
      const points = pointQueries.value[list.value.indexOf(s)]?.data
      const gps = gpQueries.value[i]?.data
      if (!points || !gps) return
      const m = buildRanking({ points, gps, members: [], userId: session.user?.id })
      const total = s.totalEvents ?? gps.length
      // Only the newest season can be in progress; older ones are closed (por confirmar).
      const newest = list.value[0]?.id === s.id
      out.push({
        seasonId: s.id,
        label: s.name ?? String(s.id),
        closed: !newest || (total > 0 && m.played.length >= total),
        played: m.played.length,
        total,
        table: m.players.map((p) => ({
          id: p.id,
          name: p.name,
          you: p.you,
          pos: p.pos,
          total: p.total,
          wins: p.wins,
        })),
      })
    })
    return out
  })
  return {
    rows,
    medals: computed(() => buildMedals(rows.value)),
    isLoading: computed(
      () =>
        seasons.isLoading.value ||
        pointQueries.value.some((q) => q.isLoading) ||
        gpQueries.value.some((q) => q.isLoading),
    ),
    error: computed(() => (seasons.isError.value ? seasons.error.value : null)),
    refetch: () => seasons.refetch(),
  }
}
