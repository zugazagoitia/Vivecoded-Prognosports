import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { Driver, Prediction, RaceResult, StartGridPosition } from '@/api/schemas'
import type { HitKind } from '@/components/data/types'
import { t } from '@/i18n'
import {
  agreePct,
  barHeights,
  consensusRow,
  driverDistribution,
  finishOf,
  finisherAt,
  gridOrder,
  hitClassForPosition,
  originalBet,
  playerCount,
  positionCount,
  tally,
  type ConsensusSeg,
} from '@/lib/consensus'
import { HIT_CLASS, hitKindOf } from '@/lib/gp'

export type ConsensusView = 'pos' | 'drv'

export interface ConsensusRowVm {
  position: number
  segments: ConsensusSeg[]
  mineCode?: string
  finisher?: string
  hitClass?: (typeof HIT_CLASS)[keyof typeof HIT_CLASS]
  hitKind?: Exclude<HitKind, 'hidden'>
  /** Screen-reader text of the whole row (the bar itself is decorative). */
  summary: string
}

export interface DriverBar {
  key: string
  label: string
  value: number
  height: number
  out: boolean
}

const codeOf = (d: Pick<Driver, 'code' | 'lastname'>) => d.code ?? d.lastname ?? ''
const nameOf = (d: Pick<Driver, 'firstname' | 'lastname'>) =>
  [d.firstname, d.lastname].filter(Boolean).join(' ')

export interface ConsensusInput {
  /** Predictions of the whole community (only passed once the session closed). */
  tipps: MaybeRefOrGetter<readonly Prediction[] | undefined>
  /** The caller's own rows. */
  mine: MaybeRefOrGetter<readonly Prediction[]>
  grid: MaybeRefOrGetter<readonly StartGridPosition[] | undefined>
  /** Official results, when published. */
  results: MaybeRefOrGetter<readonly RaceResult[] | undefined>
  /** Resets the selection when it changes (session id). */
  resetKey: MaybeRefOrGetter<unknown>
}

/** View-model of the consensus card, the per-driver chart and the three curiosities. */
export function useConsensus(input: ConsensusInput) {
  const predictions = computed(() => toValue(input.tipps) ?? [])
  const grid = computed(() => toValue(input.grid) ?? [])
  const classified = computed(() => (toValue(input.results) ?? []).filter((r) => r.position > 0))
  const hasResults = computed(() => classified.value.length > 0)
  const order = computed(() => gridOrder(grid.value))
  const players = computed(() => playerCount(predictions.value))
  const n = computed(() => positionCount(predictions.value))

  const mineByPosition = computed(
    () => new Map(toValue(input.mine).map((p) => [p.position, p.driver.id])),
  )
  const topByPosition = computed(() => {
    const out = new Map<number, number>()
    for (let pos = 1; pos <= n.value; pos++) {
      const top = tally(predictions.value, pos, order.value)[0]
      if (top) out.set(pos, top.driverId)
    }
    return out
  })

  const drivers = computed(() => {
    const out = new Map<number, Driver>()
    for (const p of predictions.value) out.set(p.driver.id, p.driver)
    for (const r of classified.value) out.set(r.driver.id, r.driver)
    for (const g of grid.value) out.set(g.driver.id, g.driver)
    return out
  })

  const rows = computed<ConsensusRowVm[]>(() =>
    Array.from({ length: n.value }, (_, i) => {
      const position = i + 1
      const mineId = mineByPosition.value.get(position)
      const mineDriver = mineId != null ? drivers.value.get(mineId) : undefined
      const segments = consensusRow(
        tally(predictions.value, position, order.value),
        players.value,
        mineId,
        t('consensus.legend.others'),
      )
      const finisher = hasResults.value ? finisherAt(position, classified.value) : undefined
      const kind =
        hasResults.value && mineId != null
          ? (hitKindOf(position, mineId, classified.value) as Exclude<HitKind, 'hidden'>)
          : undefined
      const parts = segments.map((s) =>
        s.driverId == null
          ? t('consensus.row.others', { votes: s.votes, players: players.value })
          : t('consensus.row.segment', { code: s.code, votes: s.votes, players: players.value }),
      )
      const summary = [
        `${position}.º: ${parts.length ? parts.join(', ') : t('consensus.row.none')}.`,
        mineDriver ? t('consensus.row.mineSr', { code: codeOf(mineDriver) }) : '',
        finisher
          ? kind
            ? t('consensus.row.finishedHit', {
                code: codeOf(finisher),
                kind: t(`gp.prediction.hit.${kind}`),
              })
            : t('consensus.row.finished', { code: codeOf(finisher) })
          : '',
      ]
        .filter(Boolean)
        .join(' ')
      return {
        position,
        segments,
        mineCode: mineDriver ? codeOf(mineDriver) : undefined,
        finisher: finisher ? codeOf(finisher) : undefined,
        hitClass:
          finisher && mineId != null
            ? hitClassForPosition(position, mineId, classified.value)
            : undefined,
        hitKind: kind,
        summary,
      }
    }),
  )

  // --- per driver ---
  const view = ref<ConsensusView>('pos')
  const picked = ref<number | undefined>()
  /** Default driver: the winner of the session, else the first on the grid. */
  const defaultDriver = computed(
    () =>
      classified.value.find((r) => r.position === 1)?.driver.id ??
      [...grid.value].sort((a, b) => a.position - b.position)[0]?.driver.id,
  )
  const driverId = computed(() => picked.value ?? defaultDriver.value)
  const driver = computed(() =>
    driverId.value != null ? drivers.value.get(driverId.value) : undefined,
  )
  const startsFrom = computed(
    () => grid.value.find((g) => g.driver.id === driverId.value)?.position,
  )
  const distribution = computed(() =>
    driverId.value != null
      ? driverDistribution(predictions.value, driverId.value, n.value, players.value)
      : undefined,
  )
  const bars = computed<DriverBar[]>(() => {
    const d = distribution.value
    if (!d) return []
    const values = [...d.dist, d.out]
    const heights = barHeights(values)
    return values.map((value, i) => ({
      key: i < d.dist.length ? String(i + 1) : 'out',
      label: i < d.dist.length ? `${i + 1}.º` : t('consensus.driver.out'),
      value,
      height: heights[i]!,
      out: i === d.dist.length,
    }))
  })
  /** «Acabó 3.º.» / «Acabó fuera de los 8 primeros.» / nothing while there is no result. */
  const finishText = computed(() => {
    if (!hasResults.value || driverId.value == null) return ''
    const pos = finishOf(driverId.value, classified.value)
    return pos != null && pos <= n.value
      ? t('consensus.driver.finished', { n: pos })
      : t('consensus.driver.finishedOut', { n: n.value })
  })

  function select(id: number) {
    picked.value = id
    view.value = 'drv'
  }
  watch(
    () => toValue(input.resetKey),
    () => {
      picked.value = undefined
      view.value = 'pos'
    },
  )

  // --- curiosities ---
  const top = computed(() => tally(predictions.value, 1, order.value)[0])
  const original = computed(() => originalBet(predictions.value, order.value))
  const agree = computed(() =>
    mineByPosition.value.size
      ? agreePct(mineByPosition.value, topByPosition.value, n.value)
      : undefined,
  )

  return {
    predictions,
    players,
    n,
    rows,
    hasResults,
    view,
    select,
    driverId,
    driver,
    driverName: computed(() => (driver.value ? nameOf(driver.value) : '')),
    startsFrom,
    bars,
    finishText,
    top,
    original,
    agree,
  }
}
