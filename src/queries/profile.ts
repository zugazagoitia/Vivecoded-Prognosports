import { computed } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { communitiesApi } from '@/api'
import { buildStanding } from '@/lib/home'
import {
  betterThanPct,
  historyRow,
  lastTitle,
  roundAverage,
  seasonColumns,
  seasonHistory,
} from '@/lib/profile'
import { useCommunityStandings, useMyCommunities } from './communities'
import { useCompetitionSeasons } from './gps'
import { useHomeScope, useHomeStanding } from './home'
import { keys } from './keys'

/**
 * Data of «Mi perfil» (U1). The season blocks reuse the home queries (same keys, shared cache);
 * the community rows reuse `useCommunityStandings` (H2); the history asks the season points of
 * the active community once per season. Everything keyed by the active community reloads when it
 * changes, without leaving the page.
 */
export function createProfile() {
  const scope = useHomeScope()
  const standing = useHomeStanding(scope)
  const myCommunities = useMyCommunities()
  const communityList = computed(() => myCommunities.data.value ?? [])
  const rows = useCommunityStandings(communityList)
  const seasons = useCompetitionSeasons(scope.competitionId)

  const historyQueries = useQueries({
    queries: computed(() =>
      (seasons.data.value ?? []).map((s) => ({
        queryKey: keys.points(scope.activeId.value ?? '', scope.competitionId.value ?? '', s.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          communitiesApi.getCommunityPoints(
            scope.activeId.value!,
            scope.competitionId.value!,
            s.id,
            signal,
          ),
        enabled: scope.activeId.value != null && scope.competitionId.value != null,
      })),
    ),
  })
  const history = computed(() =>
    seasonHistory(
      (seasons.data.value ?? []).map((s, i) =>
        historyRow(
          s,
          buildStanding(historyQueries.value[i]?.data, undefined),
          scope.userId.value,
          s.id === scope.seasonId.value,
        ),
      ),
    ),
  )
  const historyLoading = computed(
    () =>
      seasons.isLoading.value ||
      historyQueries.value.some((q) => q.isPending && q.fetchStatus !== 'idle'),
  )
  const historyError = computed(
    () => seasons.isError.value || historyQueries.value.some((q) => q.isError),
  )
  const refetchHistory = () => {
    if (seasons.isError.value) void seasons.refetch()
    for (const q of historyQueries.value) if (q.isError) void q.refetch()
  }

  /** Figures of the KPI blocks, all from the season standing of the active community. */
  const summary = computed(() => {
    const s = standing.standing.value
    const k = standing.kpis.value
    const last = s.gps.length - 1
    const totals = s.users.map((u) => u.cum[last] ?? 0)
    const played = s.gps.length
    const avgs = totals.map((t) => (played ? t / played : 0))
    const members = Math.max(scope.active.value?.membersAmount ?? 0, s.users.length)
    return {
      played,
      position: k.position,
      total: k.total,
      won: k.won,
      members,
      average: k.average,
      communityAverage: members ? totals.reduce((a, b) => a + b, 0) / members / (played || 1) : 0,
      pctl: k.average == null ? 0 : betterThanPct(k.average, avgs),
      roundedAverage: roundAverage(k.total ?? 0, played),
      hits: standing.resume.data.value?.totalHits,
      columns: seasonColumns(s, scope.userId.value),
    }
  })

  return {
    scope,
    standing,
    summary,
    communities: myCommunities,
    communityRows: rows,
    history,
    historyLoading,
    historyError,
    refetchHistory,
    title: computed(() => lastTitle(history.value)),
  }
}
export type Profile = ReturnType<typeof createProfile>
