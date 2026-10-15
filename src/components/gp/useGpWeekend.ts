import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { sessionState } from '@/components/states/sessionState'
import { useNow } from '@/composables/useNow'
import {
  circuitShortName,
  circuitTimeZone,
  closeText,
  formatDateRange,
  formatSessionWhen,
  gridKind,
  gridSessionFor,
  gpShortName,
  nextToCloseId,
  pickSession,
  pointsOfSession,
  predictionCells,
  sessionLabel,
  sessionStatus,
  sortedSessions,
  statusText,
  userTimeZone,
  utcOffsetLabel,
  weekendState,
  zoneCity,
} from '@/lib/gp'
import { gpRankOf, gpsWithPoints } from '@/lib/circuitDetail'
import { isSprintWeekend } from '@/lib/circuits'
import { useVariantGps, useGpPointsList } from '@/queries/circuitDetail'
import {
  useActor,
  useGpCommunityPoints,
  useGpDetail,
  useGpRulesets,
  useSessionCalculations,
  useSessionGrid,
  useSessionResults,
  useSessionTipps,
  useWeekendSessions,
  type GpArgs,
} from '@/queries/gp'
import { useSessionStore } from '@/stores/session'
import { t } from '@/i18n'
import { CLOSE_MARGIN_MS } from '@/utils/dates'
import type { HistoryEntry, SessionVm, TzMode } from './types'

/**
 * Everything the GP weekend screen (G2) shows, derived from the route params and the selected
 * session: the view-models of the sessions, the selected session's prediction/grid, the sidebar
 * data and the time zone. Each block exposes its own loading/error so one failure does not hide
 * the others.
 */
export function useGpWeekend(
  competition: MaybeRefOrGetter<string>,
  season: MaybeRefOrGetter<string>,
  gpParam: MaybeRefOrGetter<string>,
  wantedSession: MaybeRefOrGetter<string | null | undefined>,
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
  const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
  const now = computed(() => clock.value)
  const closedIds = computed(() =>
    sessions.value
      .filter((s) => Date.parse(s.date ?? '') - CLOSE_MARGIN_MS <= now.value)
      .map((s) => s.id),
  )

  const weekend = useWeekendSessions(args, sessions, closedIds)
  const communityPoints = useGpCommunityPoints(args)
  const myPoints = computed(() =>
    communityPoints.data.value?.find((p) => p.user?.id === actor.userId.value),
  )

  // --- time zone ---
  const tzMode = ref<TzMode>('mine')
  const mineTz = computed(() => userTimeZone(user.user?.timeZone))
  const circuitTz = computed(() => circuitTimeZone(gp.value?.circuit))
  const tz = computed(() => (tzMode.value === 'circuit' && circuitTz.value) || mineTz.value)
  const tzName = computed(() => {
    const at = sessions.value[0]?.date ?? now.value
    return tz.value === circuitTz.value && tzMode.value === 'circuit'
      ? t('gp.tz.ofCircuit', {
          city: circuitShortName(gp.value?.circuit) || zoneCity(tz.value),
          offset: utcOffsetLabel(tz.value, at),
        })
      : t('gp.tz.yours', { city: zoneCity(tz.value), offset: utcOffsetLabel(tz.value, at) })
  })

  // --- sessions ---
  const nextId = computed(() => nextToCloseId(sessions.value, now.value))
  const vms = computed<SessionVm[]>(() =>
    sessions.value.map((s) => {
      const state = sessionState(s, now.value, weekend.hasResults.value.get(s.id) ?? false)
      const hasPrediction = (weekend.mine.value.get(s.id)?.length ?? 0) > 0
      const closesIn = Date.parse(s.date ?? '') - CLOSE_MARGIN_MS - now.value
      const status = sessionStatus({
        state,
        hasPrediction,
        points: pointsOfSession(myPoints.value, s),
        closesInMs: closesIn,
        isNext: s.id === nextId.value,
        suspended: gp.value?.suspended === true,
      })
      return {
        session: s,
        name: sessionLabel(s).long,
        when: formatSessionWhen(s.date, tz.value),
        state,
        hasPrediction,
        status,
        statusText: statusText(status),
      }
    }),
  )
  const selected = computed(() => pickSession(sessions.value, toValue(wantedSession), now.value))
  const selectedVm = computed(() => vms.value.find((v) => v.session.id === selected.value?.id))
  const done = computed(() => vms.value.filter((v) => v.hasPrediction).length)

  const dates = computed(() => sessions.value.map((s) => s.date))
  const dateRange = (short: boolean) => formatDateRange(dates.value, tz.value, short)

  // --- selected session ---
  const selectedId = computed(() => selected.value?.id)
  const isClosed = computed(() => selectedVm.value != null && selectedVm.value.state !== 'open')
  const results = useSessionResults(args, selectedId, isClosed)
  const calculations = useSessionCalculations(
    args,
    selectedId,
    computed(() => selectedVm.value?.state === 'scored'),
  )
  const cells = computed(() =>
    selectedVm.value
      ? predictionCells(
          weekend.mine.value.get(selectedVm.value.session.id) ?? [],
          selectedVm.value.state === 'scored' ? results.data.value : undefined,
          calculations.data.value?.pointsByPosition,
        )
      : [],
  )
  const closing = computed(() =>
    selected.value ? closeText(selected.value, tz.value, now.value) : undefined,
  )

  // --- grid ---
  const gridSession = computed(() => gridSessionFor(sessions.value, selected.value))
  const grid = useSessionGrid(args, () => gridSession.value?.id)

  // --- rules ---
  const rulesets = useGpRulesets(args)

  // --- consensus (mobile): last session already closed ---
  const lastClosed = computed(() => [...vms.value].reverse().find((v) => v.state !== 'open'))
  const lastClosedTipps = useSessionTipps(args, () => lastClosed.value?.session.id)

  // --- history in this circuit ---
  const variantGps = useVariantGps(
    () => gp.value?.circuit?.id ?? '',
    () => (gp.value?.circuit ? gp.value.variant?.id : undefined),
  )
  const pastGps = computed(() =>
    gpsWithPoints(
      (variantGps.data.value ?? []).filter((g) => g.season?.id !== gp.value?.season?.id),
      now.value,
    ),
  )
  const pastPoints = useGpPointsList(pastGps, () => actor.ready.value)
  const history = computed(() => {
    const entries: (HistoryEntry & { rank?: number })[] = []
    pastGps.value.forEach((g, i) => {
      const data = pastPoints.value[i]?.data
      const mine = data?.find((p) => p.user?.id === actor.userId.value)
      if (mine?.pointsInGP == null) return
      entries.push({
        year: g.season?.name ?? '',
        points: mine.pointsInGP,
        rank: gpRankOf(actor.userId.value!, data!),
      })
    })
    entries.sort((a, b) => Number(a.year) - Number(b.year))
    const ranked = entries.filter((e) => e.rank != null)
    const best = ranked.reduce<(typeof ranked)[number] | undefined>(
      (acc, e) => (!acc || e.rank! <= acc.rank! ? e : acc),
      undefined,
    )
    return {
      entries: entries.map(({ year, points }) => ({ year, points })),
      best: best ? { rank: best.rank!, year: best.year } : undefined,
      isLoading: variantGps.isLoading.value || pastPoints.value.some((q) => q.isLoading),
      error: variantGps.error.value ?? pastPoints.value.find((q) => q.isError)?.error ?? undefined,
      refetch: () =>
        Promise.all([
          variantGps.isError.value ? variantGps.refetch() : undefined,
          ...pastPoints.value.filter((q) => q.isError).map((q) => q.refetch()),
        ]),
    }
  })

  return {
    detail,
    gp,
    args,
    actor,
    sessions,
    vms,
    selected,
    selectedVm,
    done,
    now,
    sprint: computed(() => (gp.value ? isSprintWeekend(gp.value) : false)),
    weekendState: computed(() => weekendState(sessions.value, now.value)),
    shortName: computed(() => (gp.value ? gpShortName(gp.value) : '')),
    dateRange,
    tzMode,
    tz,
    tzName,
    canCircuitTz: computed(() => circuitTz.value != null),
    weekend,
    // selected session
    cells,
    closing,
    results,
    // grid
    gridSession,
    gridKind: computed(() => gridKind(gridSession.value)),
    grid,
    // sidebar
    communityPoints,
    rulesets,
    history,
    // mobile
    lastClosed,
    lastClosedTipps,
  }
}
