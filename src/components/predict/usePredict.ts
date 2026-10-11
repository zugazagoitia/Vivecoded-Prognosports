import {
  computed,
  nextTick,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type UnwrapNestedRefs,
} from 'vue'
import { onBeforeRouteUpdate } from 'vue-router'
import { ApiError } from '@/api'
import type { Driver, RaceSession } from '@/api/schemas'
import { sessionState } from '@/components/states/sessionState'
import { useNow } from '@/composables/useNow'
import { useToast } from '@/composables/useToast'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { t } from '@/i18n'
import {
  CLOSING_SOON_MS,
  dayKey,
  formatCloseIn,
  gpShortName,
  gridSessionFor,
  nextToCloseId,
  pointsOfSession,
  sessionLabel,
  sessionStatus,
  sortedSessions,
  statusText,
  teamColor,
  userTimeZone,
} from '@/lib/gp'
import {
  capitalize,
  chosenCount,
  classifiedIds,
  closeParts,
  draftKey,
  driverCode,
  driverName,
  fillFrom,
  gridPositions,
  isDeadlineError,
  maxPointsFor,
  mobilePick,
  msToClose,
  predictedPositionsFor,
  readDraft,
  sameSel,
  validatePrediction,
  writeDraft,
  changedSlots,
} from '@/lib/predict'
import {
  useActor,
  useGpCommunityPoints,
  useGpDetail,
  useGpRulesets,
  useSessionGrid,
  useSessionResults,
  useSessionTipps,
  useWeekendSessions,
  type GpArgs,
} from '@/queries/gp'
import { useGpDrivers, useSaveTipps } from '@/queries/predict'
import { useSessionStore } from '@/stores/session'
import { usePredictionDraft } from './usePredictionDraft'

export interface PredictTab {
  id: number
  name: string
  short: string
  subtitle: string
  dot: 'done' | 'now' | 'rest'
  /** The user has a saved prediction. */
  hasPrediction: boolean
}

export interface Shortcut {
  id: string
  kind: 'grid' | 'results' | 'mine'
  label: string
  ids: number[]
}

/** «del sprint» / «de la clasificación». */
export function ofSession(s: Pick<RaceSession, 'code' | 'name'>): string {
  const l = sessionLabel(s)
  return `${l.article === 'el' ? 'del' : 'de la'} ${l.long.toLocaleLowerCase('es')}`
}

/**
 * Everything the predict screen (G3) needs, derived from the route params: the GP and its
 * sessions, N and the rules, the pool of drivers, the saved prediction, the draft with its
 * local persistence, the deadline (live), the shortcuts, saving and the guards against losing
 * unsaved changes. The components only render this.
 */
export function usePredict(
  competition: MaybeRefOrGetter<string>,
  season: MaybeRefOrGetter<string>,
  gpParam: MaybeRefOrGetter<string>,
  sesion: MaybeRefOrGetter<string>,
) {
  const actor = useActor()
  const user = useSessionStore()
  const toast = useToast()
  const clock = useNow(1000)
  const now = computed(() => clock.value)

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
  const session = computed(() => sessions.value.find((s) => String(s.id) === toValue(sesion)))
  const sessionId = computed(() => session.value?.id)
  const notFound = computed(
    () => detail.notFound.value || (gp.value != null && session.value == null),
  )
  const tz = computed(() => userTimeZone(user.user?.timeZone))
  const label = computed(() => (session.value ? sessionLabel(session.value) : undefined))

  // --- rules and N ---
  const rulesets = useGpRulesets(args)
  const ruleData = computed(() => rulesets.forGp.data.value?.data)
  const n = computed(() => predictedPositionsFor(ruleData.value, session.value) ?? 0)

  // --- deadline ---
  /** The API refused a save because of the deadline although our clock still said open. */
  const forcedClosed = ref(false)
  const closed = computed(
    () => forcedClosed.value || (session.value != null && closesIn.value <= 0),
  )
  const closesIn = computed(() => (session.value ? msToClose(session.value, now.value) : Infinity))
  const close = computed(() => (session.value ? closeParts(session.value, tz.value) : undefined))
  /** «Pronto» tag threshold (< 24 h; undocumented, see docs). */
  const soon = computed(() => closesIn.value > 0 && closesIn.value <= CLOSING_SOON_MS)

  // --- data of the session ---
  const tipps = useSessionTipps(args, sessionId)
  const driversQ = useGpDrivers(args)
  const gridSession = computed(() => gridSessionFor(sessions.value, session.value))
  const gridQ = useSessionGrid(args, () => gridSession.value?.id)
  const poolFromGrid = computed<Driver[]>(() => (gridQ.data.value ?? []).map((g) => g.driver))
  const pool = computed<Driver[]>(() => {
    const list = driversQ.data.value
    return list?.length ? list : poolFromGrid.value
  })
  const poolIds = computed(() => new Set(pool.value.map((d) => d.id)))
  const byId = computed(() => new Map(pool.value.map((d) => [d.id, d])))
  const byCode = computed(() => new Map(pool.value.map((d) => [driverCode(d), d])))
  const gridPos = computed(() => gridPositions(gridQ.data.value ?? []))

  // --- weekend (tabs, shortcut sources) ---
  const closedIds = computed(() =>
    sessions.value.filter((s) => msToClose(s, now.value) <= 0).map((s) => s.id),
  )
  const weekend = useWeekendSessions(args, sessions, closedIds)
  const communityPoints = useGpCommunityPoints(args)
  const myPoints = computed(() =>
    communityPoints.data.value?.find((p) => p.user?.id === actor.userId.value),
  )

  const tabs = computed<PredictTab[]>(() => {
    const next = nextToCloseId(sessions.value, now.value)
    return sessions.value.map((s) => {
      const state = sessionState(s, now.value, weekend.hasResults.value.get(s.id) ?? false)
      const hasPrediction = (weekend.mine.value.get(s.id)?.length ?? 0) > 0
      const left = msToClose(s, now.value)
      const status = sessionStatus({
        state,
        hasPrediction,
        points: pointsOfSession(myPoints.value, s),
        closesInMs: left,
        isNext: s.id === next,
      })
      let subtitle: string
      if (state !== 'open') subtitle = statusText(status)
      else if (left <= CLOSING_SOON_MS) {
        subtitle = t('gp.status.closing', { time: formatCloseIn(Math.floor(left / 60_000)) })
      } else {
        const c = closeParts(s, tz.value)
        const tomorrow = dayKey(now.value + 86_400_000, tz.value) === dayKey(s.date, tz.value)
        subtitle = c
          ? tomorrow
            ? t('predict.tab.tomorrow', { time: c.time })
            : t('predict.tab.on', {
                day: c.day.split(' ')[0]!.toLocaleLowerCase('es'),
                time: c.time,
              })
          : t('gp.status.open')
      }
      return {
        id: s.id,
        name: sessionLabel(s).long,
        short: sessionLabel(s).short,
        subtitle,
        dot: status.bar === 'done' ? 'done' : status.bar === 'now' ? 'now' : 'rest',
        hasPrediction,
      }
    })
  })

  // --- saved prediction and draft ---
  const saved = computed<(number | null)[]>(() => {
    const list = [...tipps.mine.value].sort((a, b) => a.position - b.position)
    const out: (number | null)[] = []
    for (const p of list) out[p.position - 1] = p.driver.id
    return Array.from({ length: out.length }, (_, i) => out[i] ?? null)
  })
  const draft = usePredictionDraft(n)
  const initializedFor = ref<number>()
  const recovered = ref(false)
  const key = computed(() =>
    sessionId.value != null && actor.communityId.value != null && actor.userId.value != null
      ? draftKey(actor.communityId.value, actor.userId.value, sessionId.value)
      : undefined,
  )
  const dataReady = computed(
    () =>
      session.value != null &&
      n.value > 0 &&
      tipps.isSuccess.value &&
      (driversQ.isSuccess.value || gridQ.isSuccess.value) &&
      key.value != null,
  )
  const initialized = computed(() => initializedFor.value === sessionId.value)

  watch(
    [dataReady, sessionId, saved],
    () => {
      if (!dataReady.value) return
      if (initializedFor.value !== sessionId.value) {
        const stored = !closed.value && key.value ? readDraft(key.value) : null
        draft.load(saved.value, stored)
        recovered.value = draft.dirty.value
        if (closed.value && key.value) writeDraft(key.value, null)
        initializedFor.value = sessionId.value
      } else {
        draft.rebase(saved.value)
      }
    },
    { immediate: true },
  )
  // New session: nothing carries over (the unsaved changes were confirmed away).
  watch(sessionId, () => {
    forcedClosed.value = false
    announce.value = ''
    sheet.value = -1
  })
  // Persist the unsaved draft on this device (cleared when it equals the saved prediction).
  watch(
    [() => draft.sel.value, () => draft.dirty.value],
    () => {
      if (!initialized.value || !key.value || closed.value) return
      writeDraft(key.value, draft.dirty.value ? draft.sel.value : null)
    },
    { deep: true },
  )

  const editable = computed(() => dataReady.value && initialized.value && !closed.value)
  /** Closed while the user had unsaved changes: the screen stays, read-only. */
  const readOnlyDraft = computed(() => closed.value && initialized.value && draft.dirty.value)

  const chosen = computed(() => chosenCount(draft.sel.value))
  const issues = computed(() =>
    validatePrediction({
      sel: draft.sel.value,
      n: n.value,
      pool: poolIds.value,
      closed: closed.value,
    }),
  )
  const missing = computed(() => issues.value.find((i) => i.key === 'missing')?.n ?? 0)
  const hardIssues = computed(() => issues.value.filter((i) => i.key !== 'missing'))
  const canSave = computed(() => editable.value && issues.value.length === 0)
  const changes = computed(() => changedSlots(draft.sel.value, draft.base.value))

  const used = computed(() => {
    const m = new Map<number, number>()
    draft.sel.value.forEach((id, i) => id != null && m.set(id, i + 1))
    return m
  })

  /** View of a driver for a slot / row. */
  function slotDriver(id: number | null, withGrid = true) {
    const d = id == null ? undefined : byId.value.get(id)
    if (!d) return null
    const grid = gridPos.value.get(d.id)
    const sub = [
      d.team?.name,
      withGrid && grid != null ? t('predict.slot.starts', { n: grid }) : '',
    ]
    return {
      code: driverCode(d),
      name: driverName(d),
      teamColor: teamColor(d),
      subtitle: sub.filter(Boolean).join(' · ') || undefined,
    }
  }

  // --- announcements (aria-live) ---
  const announce = ref('')
  function say(text: string) {
    // Same text twice in a row would not be re-announced: toggle a trailing non-breaking space.
    announce.value = announce.value === text ? `${text} ` : text
  }
  const missingText = (k: number) => t('predict.missing', { n: k }, k)
  const nameOf = (id: number) => {
    const d = byId.value.get(id)
    return d ? (d.lastname ?? driverName(d)) : ''
  }
  function afterEdit(text: string) {
    const left = n.value - chosenCount(draft.sel.value)
    say(left > 0 ? `${text} ${missingText(left)}.` : `${text} ${t('predict.ready')}.`)
  }

  // --- actions ---
  function pick(id: number) {
    if (!editable.value) return
    const at = draft.placeDriver(id)
    if (at >= 0) afterEdit(t('predict.live.placed', { driver: nameOf(id), place: `${at + 1}.º` }))
    else say(t('predict.live.full'))
  }
  function dropOn(slot: number, payload: { fromPosition?: number; driverCode?: string }) {
    if (!editable.value) return
    if (payload.fromPosition != null) {
      draft.swap(payload.fromPosition - 1, slot)
      const id = draft.sel.value[slot]
      if (id != null)
        afterEdit(t('predict.live.moved', { driver: nameOf(id), place: `${slot + 1}.º` }))
    } else if (payload.driverCode) {
      const d = byCode.value.get(payload.driverCode)
      if (!d) return
      draft.placeDriver(d.id, slot)
      afterEdit(t('predict.live.placed', { driver: nameOf(d.id), place: `${slot + 1}.º` }))
    }
  }
  /** Moves a pick and keeps the focus on it (the controls are re-rendered in the new slot). */
  async function move(i: number, dir: -1 | 1, via: 'button' | 'key') {
    if (!editable.value) return
    const id = draft.sel.value[i]
    const to = draft.moveSlot(i, dir)
    if (to < 0 || id == null) return
    afterEdit(t('predict.live.moved', { driver: nameOf(id), place: `${to + 1}.º` }))
    await nextTick()
    const row = document.querySelector<HTMLElement>(`[data-position="${to + 1}"]`)
    if (!row) return
    const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button'))
    const wanted = via === 'button' ? buttons[dir === -1 ? 0 : 1] : undefined
    const target =
      wanted && !wanted.disabled ? wanted : (buttons.find((b) => !b.disabled) ?? undefined)
    ;(via === 'key' ? row.querySelector<HTMLElement>('[role="button"]') : target)?.focus()
  }
  function removeAt(i: number) {
    const id = draft.sel.value[i]
    draft.remove(i)
    if (id != null)
      afterEdit(t('predict.live.removed', { driver: nameOf(id), place: `${i + 1}.º` }))
  }
  function clearAll() {
    draft.clear()
    say(t('predict.live.cleared'))
  }
  function discardChanges() {
    draft.discard()
    recovered.value = false
    if (key.value) writeDraft(key.value, null)
    say(t('predict.live.discarded'))
  }

  // --- mobile picker ---
  const sheet = ref(-1)
  function closeSheet() {
    sheet.value = -1
  }
  function activate(i: number) {
    draft.act.value = i
  }
  function openSlot(i: number) {
    if (!editable.value) return
    draft.act.value = i
    sheet.value = i
  }
  function pickMobile(id: number) {
    if (sheet.value < 0) return
    const r = mobilePick(draft.sel.value, sheet.value, id)
    draft.put(r.sel, r.open)
    afterEdit(t('predict.live.placed', { driver: nameOf(id), place: `${sheet.value + 1}.º` }))
    sheet.value = r.open
  }

  // --- shortcuts ---
  const gridIds = computed(() =>
    [...(gridQ.data.value ?? [])]
      .filter((g) => g.position > 0)
      .sort((a, b) => a.position - b.position)
      .map((g) => g.driver.id),
  )
  /** Latest earlier session with classified results. */
  const previousScored = computed(() => {
    const i = sessions.value.findIndex((s) => s.id === sessionId.value)
    return sessions.value
      .slice(0, Math.max(i, 0))
      .reverse()
      .find((s) => weekend.hasResults.value.get(s.id))
  })
  const prevResults = useSessionResults(
    args,
    () => previousScored.value?.id,
    () => previousScored.value != null,
  )
  const shortcuts = computed<Shortcut[]>(() => {
    const out: Shortcut[] = []
    if (gridIds.value.length) {
      out.push({ id: 'grid', kind: 'grid', label: t('predict.shortcuts.grid'), ids: gridIds.value })
    }
    const ps = previousScored.value
    const results = prevResults.data.value
    if (ps && results?.length) {
      out.push({
        id: `results-${ps.id}`,
        kind: 'results',
        label: t('predict.shortcuts.results', { session: ofSession(ps) }),
        ids: classifiedIds(results),
      })
    }
    for (const s of sessions.value) {
      if (s.id === sessionId.value) continue
      const mine = weekend.mine.value.get(s.id) ?? []
      if (!mine.length) continue
      out.push({
        id: `mine-${s.id}`,
        kind: 'mine',
        label: t('predict.shortcuts.mine', { session: ofSession(s) }),
        ids: [...mine].sort((a, b) => a.position - b.position).map((p) => p.driver.id),
      })
    }
    return out
  })
  function applyShortcut(s: Shortcut) {
    if (!editable.value) return
    draft.replaceAll(fillFrom(s.ids, gridIds.value, n.value, poolIds.value))
    sheet.value = -1
    afterEdit(t('predict.live.filled', { label: s.label }))
  }

  // --- save ---
  const save = useSaveTipps()
  const saving = computed(() => save.isPending.value)
  const saveError = ref<string>()
  const attempted = ref(false)
  async function submit() {
    if (!editable.value || saving.value || !args.value || sessionId.value == null) return
    attempted.value = true
    if (!canSave.value) {
      say(missing.value ? missingText(missing.value) : t('predict.errors.invalid'))
      return
    }
    saveError.value = undefined
    const sessionNow = session.value!
    try {
      await save.mutateAsync({
        args: args.value,
        session: sessionId.value,
        sel: [...draft.sel.value],
        drivers: pool.value,
      })
      draft.markSaved()
      recovered.value = false
      attempted.value = false
      if (key.value) writeDraft(key.value, null)
      toast.success(
        t('predict.toast.saved', { session: ofSession(sessionNow) }),
        t('predict.toast.savedText'),
      )
      say(t('predict.live.saved', { session: ofSession(sessionNow) }))
    } catch (e) {
      if (isDeadlineError(e, closesIn.value <= 60_000)) {
        forcedClosed.value = true
        saveError.value = t('predict.errors.deadline')
        toast.error(t('predict.errors.deadlineTitle'), t('predict.errors.deadlineText'))
        say(t('predict.errors.deadlineTitle'))
      } else if (e instanceof ApiError && (e.kind === 'network' || e.kind === 'timeout')) {
        saveError.value = t('predict.errors.offline')
        toast.error(t('predict.errors.offlineTitle'), t('predict.errors.offline'))
        say(t('predict.errors.offlineTitle'))
      } else {
        const msg = e instanceof ApiError && e.message ? e.message : t('predict.errors.generic')
        saveError.value = msg
        toast.error(t('predict.errors.saveTitle'), msg)
        say(t('predict.errors.saveTitle'))
      }
    }
  }

  // The deadline arrives while the screen is open.
  watch(closed, (isClosed, was) => {
    if (!isClosed || was || !initialized.value) return
    sheet.value = -1
    if (draft.dirty.value) {
      toast.error(t('predict.closedLive.title'), t('predict.closedLive.unsaved'))
      say(t('predict.closedLive.unsaved'))
    } else {
      say(t('predict.closedLive.title'))
    }
  })
  // 5 minutes before the deadline the countdown is announced once.
  watch(
    () => closesIn.value <= 5 * 60_000 && closesIn.value > 0,
    (near) => {
      if (near && editable.value) say(t('predict.live.fiveMin'))
    },
  )

  // --- guards ---
  const guard = computed(() => draft.dirty.value && !closed.value)
  const unsaved = useUnsavedChanges(guard)
  const switchOpen = ref(false)
  let switchResolver: ((allow: boolean) => void) | null = null
  onBeforeRouteUpdate((to, from) => {
    const sesionOf = (r: { params: object }) => (r.params as Record<string, unknown>).sesion
    if (!guard.value || sesionOf(to) === sesionOf(from)) return true
    switchResolver?.(false)
    switchOpen.value = true
    return new Promise<boolean>((resolve) => {
      switchResolver = resolve
    })
  })
  function settleSwitch(allow: boolean) {
    switchOpen.value = false
    if (allow) {
      draft.discard()
      recovered.value = false
      if (key.value) writeDraft(key.value, null)
    }
    switchResolver?.(allow)
    switchResolver = null
  }
  function leaveAndDiscard() {
    draft.discard()
    if (key.value) writeDraft(key.value, null)
    unsaved.leave()
  }

  // --- info for the header / closed states ---
  const closedInfo = computed(() => {
    const s = session.value
    if (!s || !closed.value) return undefined
    const scored = weekend.hasResults.value.get(s.id) ?? false
    const has = (weekend.mine.value.get(s.id)?.length ?? 0) > 0
    const points = pointsOfSession(myPoints.value, s)
    return {
      scored,
      has,
      points,
      max: maxPointsFor(ruleData.value, s, n.value),
    }
  })

  const loading = computed(
    () =>
      !notFound.value &&
      (detail.isLoading.value ||
        gp.value == null ||
        rulesets.forGp.isLoading.value ||
        tipps.isLoading.value ||
        driversQ.isLoading.value ||
        (dataReady.value && !initialized.value)),
  )
  const failed = computed(() => {
    if (detail.isError.value)
      return { error: detail.error.value, retry: detail.refetch, what: 'gp' }
    if (rulesets.forGp.isError.value)
      return {
        error: rulesets.forGp.error.value,
        retry: () => rulesets.forGp.refetch(),
        what: 'rules',
      }
    if (tipps.isError.value)
      return { error: tipps.error.value, retry: () => tipps.refetch(), what: 'tipps' }
    if (driversQ.isError.value && !poolFromGrid.value.length)
      return { error: driversQ.error.value, retry: () => driversQ.refetch(), what: 'drivers' }
    return undefined
  })
  /** Rule set arrived but gives no N for this session (and no default exists). */
  const noPositions = computed(
    () => rulesets.forGp.isSuccess.value && session.value != null && n.value === 0,
  )

  return {
    detail,
    gp,
    args,
    sessions,
    session,
    notFound,
    label,
    shortName: computed(() => (gp.value ? gpShortName(gp.value) : '')),
    tz,
    now,
    n,
    ruleset: rulesets,
    closed,
    closesIn,
    close,
    soon,
    editable,
    readOnlyDraft,
    closedInfo,
    tabs,
    draft,
    pool,
    gridQ,
    gridPos,
    hasGrid: computed(() => gridIds.value.length > 0),
    used,
    chosen,
    issues,
    hardIssues,
    missing,
    canSave,
    changes,
    attempted,
    recovered,
    slotDriver,
    announce,
    pick,
    dropOn,
    move,
    removeAt,
    clearAll,
    discardChanges,
    sheet,
    openSlot,
    closeSheet,
    activate,
    pickMobile,
    shortcuts,
    applyShortcut,
    submit,
    saving,
    saveError,
    unsaved: { ...unsaved, leave: leaveAndDiscard },
    switchGuard: {
      open: switchOpen,
      stay: () => settleSwitch(false),
      leave: () => settleSwitch(true),
    },
    loading,
    failed,
    noPositions,
    capitalize,
    sameSel,
    communityPoints,
  }
}

/** What the components receive (wrapped in `reactive`, so refs are unwrapped). */
export type PredictVm = UnwrapNestedRefs<ReturnType<typeof usePredict>>
