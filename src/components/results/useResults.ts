import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { UserPoints } from '@/api/schemas'
import { useNow } from '@/composables/useNow'
import { gpShortName, sortedSessions, userTimeZone } from '@/lib/gp'
import {
  bannerFor,
  breakdownRows,
  buildRows,
  classified,
  closingLabel,
  deriveMoment,
  gpBonus,
  nearCount,
  picksOf,
  positionCount,
  rulesOf,
  winnersOf,
  type Player,
} from '@/lib/results'
import { useCommunityMembers } from '@/queries/community'
import {
  useActor,
  useGpCommunityPoints,
  useGpDetail,
  useGpRulesets,
  useSessionCalculations,
  useSessionResults,
  useSessionTipps,
  type GpArgs,
} from '@/queries/gp'
import { useSessionStore } from '@/stores/session'
import { isClosed } from '@/utils/dates'

/**
 * Everything the results screen (G5) shows for one session of a GP: the moment (derived from the
 * closing time and the existence of results), the community rows, the banner, and the user's
 * breakdown. Each block keeps its own loading/error state.
 */
export function useResults(
  competition: MaybeRefOrGetter<string>,
  season: MaybeRefOrGetter<string>,
  gpParam: MaybeRefOrGetter<string>,
  sessionParam: MaybeRefOrGetter<string>,
) {
  const actor = useActor()
  const user = useSessionStore()
  const clock = useNow(15_000)
  const detail = useGpDetail(competition, season, gpParam)
  const gp = detail.gp
  const args = computed<GpArgs | undefined>(() =>
    gp.value
      ? {
          competition: gp.value.competition?.id ?? toValue(competition),
          season: gp.value.season?.id ?? toValue(season),
          gp: gp.value.id,
        }
      : undefined,
  )
  const prevArgs = computed<GpArgs | undefined>(() => {
    const p = detail.previous.value
    return p && args.value
      ? { competition: args.value.competition, season: args.value.season, gp: p.id }
      : undefined
  })

  const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
  const session = computed(() => sessions.value.find((s) => String(s.id) === toValue(sessionParam)))
  const sessionId = computed(() => session.value?.id)
  const sessionNotFound = computed(() => gp.value != null && session.value == null)
  const closed = computed(() => session.value != null && isClosed(session.value, clock.value))

  const results = useSessionResults(args, sessionId, closed)
  const tipps = useSessionTipps(args, sessionId)
  const points = useGpCommunityPoints(args)
  const prevPoints = useGpCommunityPoints(prevArgs)
  const members = useCommunityMembers(
    () => actor.communityId.value ?? '',
    () => actor.ready.value,
  )
  const rulesets = useGpRulesets(args)

  const classifiedResults = computed(() => classified(results.data.value))
  /** Known once the results query has settled (or the session is still open). */
  const resolved = computed(
    () => session.value != null && (!closed.value || results.isSuccess.value),
  )
  const moment = computed(() =>
    session.value && resolved.value
      ? deriveMoment(session.value, clock.value, classifiedResults.value.length > 0)
      : undefined,
  )
  const calculations = useSessionCalculations(args, sessionId, () => moment.value === 'res')

  const rules = computed(() =>
    session.value ? rulesOf(rulesets.forGp.data.value?.data, session.value) : undefined,
  )
  const tz = computed(() => userTimeZone(user.user?.timeZone))

  // --- players and accumulated points before this GP ---
  const players = computed<Player[]>(() => {
    const map = new Map<number, Player>()
    const add = (u: { id?: number | null; username?: string | null } | null | undefined) => {
      if (u?.id != null && u.username) map.set(u.id, { id: u.id, username: u.username })
    }
    members.data.value?.forEach(add)
    points.data.value?.forEach((p) => add(p.user))
    tipps.data.value?.forEach((p) => add(p.user))
    if (user.user) add(user.user)
    return [...map.values()]
  })
  const pointsByUser = computed(
    () =>
      new Map<number, UserPoints>(
        (points.data.value ?? []).flatMap((p) => (p.user?.id != null ? [[p.user.id, p]] : [])),
      ),
  )
  /** `undefined` while the previous GP's points load (or fail): totals show «—». */
  const before = computed(() => {
    if (!detail.previous.value) return new Map<number, number>()
    if (!prevPoints.isSuccess.value) return undefined
    return new Map<number, number>(
      (prevPoints.data.value ?? []).flatMap((p) =>
        p.user?.id != null ? [[p.user.id, p.accumulatedPoints ?? 0]] : [],
      ),
    )
  })
  /** General season order up to the previous GP (1 = leader). */
  const standings = computed(() => {
    const b = before.value
    if (!b) return new Map<number, number>()
    const ids = players.value.map((p) => p.id).sort((x, y) => (b.get(y) ?? 0) - (b.get(x) ?? 0))
    return new Map(ids.map((id, i) => [id, i + 1]))
  })

  const rows = computed(() =>
    session.value && moment.value
      ? buildRows({
          players: players.value,
          tipps: tipps.data.value ?? [],
          results: classifiedResults.value,
          moment: moment.value,
          userId: actor.userId.value,
          points: pointsByUser.value,
          before: before.value,
          session: session.value,
          rules: rules.value,
          standings: standings.value,
        })
      : [],
  )
  const positions = computed(() => {
    return positionCount(tipps.data.value ?? []) || rules.value?.predicted || 0
  })
  const anyPick = computed(() => rows.value.some((r) => r.hasPick))
  const winners = computed(() => winnersOf(rows.value))
  const banner = computed(() =>
    moment.value && session.value
      ? bannerFor(moment.value, {
          closing: closingLabel(session.value, tz.value),
          winners: winners.value,
        })
      : undefined,
  )
  const myRow = computed(() => rows.value.find((r) => r.you))

  // --- «Tu desglose» ---
  const breakdown = computed(() =>
    breakdownRows(classifiedResults.value, myRow.value?.picks ?? picksOf([]), {
      pointsByPosition: calculations.data.value?.pointsByPosition,
      rules: rules.value,
    }),
  )
  const near = computed(() => nearCount(breakdown.value))

  const allClosed = computed(() => sessions.value.every((s) => isClosed(s, clock.value)))
  const bonus = computed(() =>
    gpBonus(points.data.value ?? [], rules.value?.topScorer, allClosed.value),
  )

  /** Shown names: first failing essential query. */
  const error = computed(
    () =>
      (closed.value && results.isError.value ? results.error.value : null) ??
      (tipps.isError.value ? tipps.error.value : null),
  )
  const loading = computed(
    () =>
      !gp.value ||
      !resolved.value ||
      tipps.isLoading.value ||
      (closed.value && results.isLoading.value),
  )

  return {
    detail,
    gp,
    args,
    actor,
    sessions,
    session,
    sessionNotFound,
    moment,
    results,
    classifiedResults,
    tipps,
    points,
    members,
    rulesets,
    calculations,
    rules,
    rows,
    /** Accumulated points before this GP by user (G6); undefined while loading or on error. */
    before,
    beforeLoading: prevPoints.isLoading,
    positions,
    anyPick,
    winners,
    banner,
    myRow,
    breakdown,
    near,
    bonus,
    allClosed,
    error,
    loading,
    shortName: computed(() => (gp.value ? gpShortName(gp.value) : '')),
    refetch: () => Promise.all([results.refetch(), tipps.refetch()]),
  }
}
