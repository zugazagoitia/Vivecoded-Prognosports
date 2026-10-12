import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ApiError, competitionsApi, type GrandPrix, type RaceSession } from '@/api'
import { sessionState } from '@/components/states/sessionState'
import { isSprintWeekend } from '@/lib/circuits'
import {
  circuitShortName,
  gpShortName,
  nextToCloseId,
  pointsOfSession,
  sessionLabel,
  sortedSessions,
  userTimeZone,
} from '@/lib/gp'
import {
  buildKpis,
  buildStanding,
  chartModel,
  dayParts,
  nearWindow,
  sessionRowState,
  type ChartMode,
  type RowState,
} from '@/lib/home'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { CLOSE_MARGIN_MS } from '@/utils/dates'
import { useSeasonGps } from './circuits'
import { useActor, useGpCommunityPoints, useWeekendSessions, type GpArgs } from './gp'
import { useNextGp } from './gps'
import { keys } from './keys'
import { useCommunityPoints, useUserResume } from './resources'

/**
 * Queries of the home screen (H1). Each block has its own queries, so one failing block does not
 * break the others. Every community-dependent key carries the active community id (see `keys`),
 * so switching community reloads the blocks without leaving the route.
 */

/** Signed-in user, active community and the competition/season it plays. */
export function useHomeScope() {
  const session = useSessionStore()
  const community = useCommunityStore()
  const competitionId = computed(() => community.active?.competition?.id)
  const seasonQ = useQuery({
    queryKey: computed(() => keys.currentSeason(competitionId.value ?? '')),
    queryFn: ({ signal }) => competitionsApi.getCurrentSeason(competitionId.value!, signal),
    enabled: computed(() => competitionId.value != null),
  })
  return {
    user: computed(() => session.user),
    userId: computed(() => session.user?.id),
    tz: computed(() => userTimeZone(session.user?.timeZone)),
    communities: computed(() => community.communities),
    activeId: computed(() => community.activeId),
    active: computed(() => community.active),
    select: (id: number) => community.select(id),
    competitionId,
    competition: computed(() => community.active?.competition ?? null),
    season: computed(() => seasonQ.data.value),
    seasonId: computed(() => seasonQ.data.value?.id),
    seasonQ,
  }
}
export type HomeScope = ReturnType<typeof useHomeScope>

/** `false` for «there is no next GP» (the API answers 404), which is not an error. */
const isNone = (e: unknown) => e instanceof ApiError && e.kind === 'http' && e.status === 404

export interface HomeRow {
  session: RaceSession
  name: string
  article: string
  /** «VIE», «9», «17:30» in the user's zone. */
  day: ReturnType<typeof dayParts>
  rs: RowState
  /** Open: ms until closing. */
  closesInMs: number
  scored: boolean
  hasPrediction: boolean
  points?: number
}

/** The next (or current) GP with the state of each of its sessions. */
export function useHomeNext(scope: HomeScope, now: Ref<number>) {
  const actor = useActor()
  const next = useNextGp(scope.competitionId)
  const gp = computed<GrandPrix | undefined>(() => next.data.value)
  const args = computed<GpArgs | undefined>(() =>
    gp.value
      ? {
          competition: gp.value.competition?.id ?? scope.competitionId.value!,
          season: gp.value.season?.id ?? scope.seasonId.value ?? '',
          gp: gp.value.id,
        }
      : undefined,
  )
  const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
  const closedIds = computed(() =>
    sessions.value
      .filter((s) => Date.parse(s.date ?? '') - CLOSE_MARGIN_MS <= now.value)
      .map((s) => s.id),
  )
  const weekend = useWeekendSessions(args, sessions, closedIds)
  const points = useGpCommunityPoints(args)
  const mine = computed(() => points.data.value?.find((p) => p.user?.id === actor.userId.value))

  const rows = computed<HomeRow[]>(() =>
    sessions.value.map((s) => {
      const state = sessionState(s, now.value, weekend.hasResults.value.get(s.id) ?? false)
      const hasPrediction = (weekend.mine.value.get(s.id)?.length ?? 0) > 0
      const closesInMs = Date.parse(s.date ?? '') - CLOSE_MARGIN_MS - now.value
      const pts = pointsOfSession(mine.value, s)
      const label = sessionLabel(s)
      return {
        session: s,
        name: label.long,
        article: label.withArticle,
        day: dayParts(s.date, scope.tz.value),
        rs: sessionRowState({ state, hasPrediction, points: pts, closesInMs }),
        closesInMs,
        scored: state === 'scored',
        hasPrediction,
        points: pts,
      }
    }),
  )
  const nextId = computed(() => nextToCloseId(sessions.value, now.value))
  return {
    gp,
    rows,
    none: computed(() => next.isError.value && isNone(next.error.value)),
    isLoading: computed(() => next.isLoading.value),
    isError: computed(() => next.isError.value && !isNone(next.error.value)),
    error: computed(() => next.error.value),
    refetch: () => next.refetch(),
    /** Per-session data (predictions, results) is loading / failed. */
    rowsLoading: weekend.isLoading,
    rowsError: weekend.isError,
    rowsRefetch: weekend.refetch,
    done: computed(() => rows.value.filter((r) => r.hasPrediction).length),
    /** The next session to close (its countdown and the footer of the block). */
    nextSession: computed(() => rows.value.find((r) => r.session.id === nextId.value)),
    sprint: computed(() => (gp.value ? isSprintWeekend(gp.value) : false)),
    shortName: computed(() => (gp.value ? gpShortName(gp.value) : '')),
    circuit: computed(() =>
      gp.value ? (gp.value.circuit?.name ?? circuitShortName(gp.value.circuit)) : '',
    ),
  }
}

/** Season GPs, community points and resume of the user: the data behind KPIs, ranking and chart. */
export function useHomeStanding(scope: HomeScope) {
  const gps = useSeasonGps(
    () => scope.competitionId.value ?? '',
    () => scope.seasonId.value,
  )
  const points = useCommunityPoints(scope.competitionId, scope.seasonId)
  const resume = useUserResume(scope.userId, scope.competitionId, scope.seasonId)
  const standing = computed(() => buildStanding(points.data.value, gps.data.value))
  const won = computed(() => {
    const w = resume.data.value?.wonGrandPrixes
    return Array.isArray(w) ? w.length : undefined
  })
  return {
    gps: computed(() => gps.data.value),
    standing,
    resume,
    won,
    kpis: computed(() => buildKpis(standing.value, scope.userId.value, won.value)),
    near: computed(() => nearWindow(standing.value, scope.userId.value)),
    model: (mode: ChartMode) => chartModel(standing.value, scope.userId.value, mode),
    isLoading: computed(
      () => scope.seasonQ.isLoading.value || points.isLoading.value || gps.isLoading.value,
    ),
    isError: computed(() => scope.seasonQ.isError.value || points.isError.value),
    error: computed(() => scope.seasonQ.error.value ?? points.error.value),
    refetch: () =>
      Promise.all([
        scope.seasonQ.isError.value ? scope.seasonQ.refetch() : undefined,
        points.isError.value ? points.refetch() : undefined,
        gps.isError.value ? gps.refetch() : undefined,
      ]),
  }
}
export type HomeStanding = ReturnType<typeof useHomeStanding>
