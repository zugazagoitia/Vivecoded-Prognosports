import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import type { Driver } from '@/api/schemas'
import { useResults } from '@/components/results/useResults'
import { useNow } from '@/composables/useNow'
import { gridSessionFor, isSprintSession, teamColor } from '@/lib/gp'
import { classified, maxPossible, scorePrediction, type Picks } from '@/lib/results'
import {
  moveRow,
  myPointsByDriver,
  podiumClass,
  rankingAfter,
  scenarioFill,
  seededShuffle,
  sessionPlace,
  sprintRaceOf,
  swapOnSelect,
  type PlayerTotals,
  type Scenario,
} from '@/lib/simulator'
import { useSessionGrid, useSessionResults } from '@/queries/gp'
import { useGpDrivers, useSimulation } from '@/queries/simulator'
import { isClosed } from '@/utils/dates'

export const DEBOUNCE_MS = 300
/** Positions simulated when neither the rule set nor any prediction says how many (mockup: 8). */
const FALLBACK_POSITIONS = { race: 8, sprint: 5 }

export interface SimDriver {
  id: number
  code: string
  lastname: string
  name: string
  color?: string
}

const toSimDriver = (d: Driver): SimDriver => ({
  id: d.id,
  code: d.code ?? d.lastname?.slice(0, 3).toUpperCase() ?? String(d.id),
  lastname: d.lastname ?? d.code ?? String(d.id),
  name: [d.firstname, d.lastname].filter(Boolean).join(' '),
  color: teamColor(d),
})

/** Debounced copy of a getter (trailing). */
function useDebounced<T>(source: () => T, ms: number) {
  const out = shallowRef<T>(source())
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, (v) => {
    clearTimeout(timer)
    timer = setTimeout(() => (out.value = v), ms)
  })
  onScopeDispose(() => clearTimeout(timer))
  return out
}

/**
 * State and derived values of the simulator (G6). All the numbers on screen are computed locally
 * and instantly (`scorePrediction` with the community's rules); `POST .../calculations` runs
 * debounced and, when it answers for the CURRENT result, its `pointsByPosition` replaces your
 * local points. Nothing is stored.
 */
export function useSimulator(
  competition: MaybeRefOrGetter<string>,
  season: MaybeRefOrGetter<string>,
  gpParam: MaybeRefOrGetter<string>,
  sessionParam: MaybeRefOrGetter<string>,
  /** Seed of the first «Caos» (tests); a random one when missing. */
  chaosSeed: MaybeRefOrGetter<number | undefined> = () => undefined,
) {
  const r = useResults(competition, season, gpParam, sessionParam)
  const clock = useNow(15_000)
  const { args, gp, session, sessions, actor } = r

  // --- catalogue of drivers ---
  const driversQ = useGpDrivers(args)
  const gridSession = computed(() =>
    gp.value && session.value ? gridSessionFor(sessions.value, session.value) : undefined,
  )
  const gridQ = useSessionGrid(args, () => gridSession.value?.id)
  const sprint = computed(() => sprintRaceOf(sessions.value))
  const sprintUsable = computed(() => sprint.value != null && sprint.value.id !== session.value?.id)
  const sprintClosed = computed(() => sprintUsable.value && isClosed(sprint.value!, clock.value))
  const sprintQ = useSessionResults(args, () => sprint.value?.id, sprintClosed)

  const mine = computed<Picks>(() => r.myRow.value?.picks ?? {})
  const mineIds = computed(() =>
    Object.entries(mine.value)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, pk]) => pk.driverId),
  )
  const hasMine = computed(() => mineIds.value.length > 0)
  const gridIds = computed(() =>
    [...(gridQ.data.value ?? [])].sort((a, b) => a.position - b.position).map((g) => g.driver.id),
  )
  const sprintIds = computed(() => classified(sprintQ.data.value).map((x) => x.driver.id))

  /** Union of every source of drivers: the GP list, the grid, your picks, the sprint. */
  const drivers = computed<SimDriver[]>(() => {
    const map = new Map<number, SimDriver>()
    const add = (d: Driver) => {
      if (!map.has(d.id)) map.set(d.id, toSimDriver(d))
    }
    driversQ.data.value?.forEach(add)
    gridQ.data.value?.forEach((g) => add(g.driver))
    Object.values(r.myRow.value?.picks ?? {}).forEach((pk) =>
      add({ id: pk.driverId, code: pk.code, lastname: pk.name, color: pk.color }),
    )
    sprintQ.data.value?.forEach((x) => add(x.driver))
    return [...map.values()].sort((a, b) => a.lastname.localeCompare(b.lastname, 'es'))
  })
  const byId = computed(() => new Map(drivers.value.map((d) => [d.id, d])))
  /** Default order when there is no grid: grid, else the GP list as the API sends it. */
  const listIds = computed(() => (driversQ.data.value ?? []).map((d) => d.id))

  // --- number of positions ---
  const n = computed(() => {
    const fromData = r.positions.value
    if (fromData > 0) return fromData
    if (hasMine.value) return mineIds.value.length
    if (!session.value) return 0
    return isSprintSession(session.value) ? FALLBACK_POSITIONS.sprint : FALLBACK_POSITIONS.race
  })

  // --- scenarios ---
  const available = computed<Record<Scenario, boolean>>(() => ({
    grid: gridIds.value.length > 0,
    sprint: sprintUsable.value && sprintIds.value.length > 0,
    mine: hasMine.value,
    chaos: drivers.value.length >= n.value && n.value > 0,
  }))
  const pool = computed(() =>
    scenarioFill(
      listIds.value,
      drivers.value.map((d) => d.id),
      1e9,
    ),
  )
  const chaosCount = ref(0)
  const seed = ref(toValue(chaosSeed) ?? Math.floor(Math.random() * 2 ** 31))
  const baseSeed = seed.value

  function fill(sc: Scenario): number[] {
    switch (sc) {
      case 'grid':
        return scenarioFill(gridIds.value, pool.value, n.value)
      case 'sprint':
        return scenarioFill(
          sprintIds.value,
          gridIds.value.length ? gridIds.value : pool.value,
          n.value,
        )
      case 'mine':
        return scenarioFill(mineIds.value, pool.value, n.value)
      case 'chaos':
        return seededShuffle(pool.value, baseSeed + chaosCount.value).slice(0, n.value)
    }
  }

  const sim = ref<number[]>([])
  /** Active scenario chip; `null` after editing by hand (or without a starting point). */
  const scenario = ref<Scenario | null>(null)
  function apply(sc: Scenario) {
    // Pressing «Caos» again draws a new one.
    if (sc === 'chaos' && scenario.value === 'chaos') chaosCount.value++
    sim.value = fill(sc)
    scenario.value = sc
  }

  const ready = computed(
    () =>
      !!session.value &&
      !r.loading.value &&
      !driversQ.isLoading.value &&
      !gridQ.isLoading.value &&
      n.value > 0,
  )
  const initialised = ref(false)
  watch(
    ready,
    (ok) => {
      if (!ok || initialised.value) return
      initialised.value = true
      // Mockup default «Como la parrilla»; without grid, your prediction; else the driver list.
      if (available.value.grid) apply('grid')
      else if (available.value.mine) apply('mine')
      else {
        sim.value = scenarioFill([], pool.value, n.value)
        scenario.value = null
      }
    },
    { immediate: true },
  )

  function select(index: number, driverId: number) {
    sim.value = swapOnSelect(sim.value, index, driverId)
    scenario.value = null
  }
  function move(index: number, dir: -1 | 1) {
    const next = moveRow(sim.value, index, dir)
    if (next.every((id, i) => id === sim.value[i])) return
    sim.value = next
    scenario.value = null
  }

  // --- scoring ---
  const debounced = useDebounced(() => sim.value.join('-'), DEBOUNCE_MS)
  const debouncedIds = computed(() =>
    debounced.value ? debounced.value.split('-').map(Number) : [],
  )
  const calc = useSimulation(
    args,
    () => session.value?.id,
    debouncedIds,
    () => hasMine.value && initialised.value,
  )
  /** The API answer only counts when it is for the result on screen. */
  const apiPoints = computed(() => {
    if (calc.isPlaceholderData.value || debounced.value !== sim.value.join('-')) return null
    return calc.data.value?.pointsByPosition ?? null
  })
  const recalculating = computed(
    () => debounced.value !== sim.value.join('-') || calc.isFetching.value,
  )

  const myScore = computed(() =>
    myPointsByDriver(mine.value, sim.value, r.rules.value, apiPoints.value),
  )
  const maxPoints = computed(() => maxPossible(r.rules.value, n.value))

  // --- community ---
  /** Before closing, other players' predictions are never read: no session place or general. */
  const othersVisible = computed(() => r.moment.value != null && r.moment.value !== 'pre')
  const simResults = computed(() => sim.value.map((id, i) => ({ driver: { id }, position: i + 1 })))
  const players = computed<PlayerTotals[] | undefined>(() => {
    const before = r.before.value
    if (!othersVisible.value || !before || !r.rules.value) return undefined
    return r.rows.value.map((row) => {
      const you = row.you
      const sim = !row.hasPick
        ? 0
        : you
          ? myScore.value.total
          : scorePrediction(row.picks, simResults.value, r.rules.value!).total
      return {
        id: row.id,
        username: row.username,
        you,
        hasPick: row.hasPick,
        before: before.get(row.id) ?? 0,
        sim,
      }
    })
  })
  const standings = computed(() => (players.value ? rankingAfter(players.value) : undefined))
  const me = computed(() => standings.value?.find((s) => s.you))
  const place = computed(() =>
    players.value && actor.userId.value != null
      ? sessionPlace(players.value, actor.userId.value)
      : undefined,
  )
  const withPick = computed(() => players.value?.filter((p) => p.hasPick).length ?? 0)
  const leaderTotal = computed(() => standings.value?.[0]?.total ?? 0)

  const rowsVm = computed(() =>
    sim.value.map((id, i) => ({
      position: i + 1,
      driverId: id,
      driver: byId.value.get(id),
      score: myScore.value.rows[i]!,
    })),
  )
  const standingsVm = computed(() =>
    (standings.value ?? []).map((s) => ({ ...s, podium: podiumClass(s.afterPos - 1) })),
  )

  const loadingInitial = computed(() => !initialised.value && !r.error.value)

  return {
    r,
    drivers,
    n,
    sim,
    scenario,
    available,
    apply,
    select,
    move,
    hasMine,
    mine,
    mineCodes: computed(() => mineIds.value.map((id) => byId.value.get(id)?.code ?? '')),
    myScore,
    maxPoints,
    rowsVm,
    othersVisible,
    standings: standingsVm,
    me,
    place,
    withPick,
    leaderTotal,
    recalculating,
    calcError: computed(() => calc.isError.value),
    loadingInitial,
    initialised,
    /**
     * Simulating is allowed from the moment the grid exists until the official result:
     * `official` (session already scored) and `noGrid` (grid not published yet) block it.
     */
    blocked: computed<'official' | 'noGrid' | null>(() => {
      if (r.moment.value === 'res') return 'official'
      return ready.value && !available.value.grid ? 'noGrid' : null
    }),
  }
}
