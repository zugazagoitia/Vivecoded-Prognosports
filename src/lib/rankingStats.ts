import type { RuleSetData } from '@/api/schemas'
import { t } from '@/i18n'
import {
  mean,
  median,
  minus,
  percentileOf,
  sessionKeys,
  stdDev,
  type RankGp,
  type RankModel,
  type RankPlayer,
} from './ranking'

/** Pure logic of the statistics screens R3, R4, R7, R8, R9, R10, R11 and R13. */

// --- Shared --------------------------------------------------------------------------------

/** `12–58` with an en dash. */
export const rangeText = (min: number, max: number): string => `${min}–${max}`

/** Signed difference: «+5», «−3» (U+2212), «0». */
export function signed(d: number): string {
  return d > 0 ? `+${d}` : d < 0 ? minus(d) : '0'
}

/** Players sorted by the general table, with you excluded. */
export const others = (model: Pick<RankModel, 'players'>): RankPlayer[] =>
  model.players.filter((p) => !p.you)

// --- R3: my season -------------------------------------------------------------------------

export interface SeasonGpRow {
  gp: RankGp
  index: number
  pts: number
  median: number
  min: number
  max: number
  /** Percentile among the community in that GP. */
  pc: number
  /** Place in the GP. */
  place: number
  won: boolean
}

export function mySeasonRows(model: RankModel, me: RankPlayer): SeasonGpRow[] {
  return model.played.map((gp, g) => {
    const all = model.players.map((p) => p.pts[g] ?? 0)
    const pts = me.pts[g] ?? 0
    return {
      gp,
      index: g,
      pts,
      median: median(all),
      min: Math.min(...all),
      max: Math.max(...all),
      // «pts of the others < mine»: the percentile of the mockup counts everyone below me.
      pc: percentileOf(pts, all),
      place: me.gpPlaces[g] ?? 0,
      won: (me.gpPlaces[g] ?? 0) === 1 && pts > 0,
    }
  })
}

/** Longest run of consecutive values `≤ limit`. */
export function bestStreak(ranks: readonly number[], limit = 5): number {
  let best = 0
  let run = 0
  for (const r of ranks) {
    run = r <= limit ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

export type PctTone = 'brand-800' | 'you' | 'brand-300'

export function barColorPct(pc: number): PctTone {
  return pc >= 75 ? 'brand-800' : pc >= 50 ? 'you' : 'brand-300'
}

/** Index of the highest (or lowest) value; the first one on ties. */
export function bestWorstGp(values: readonly number[]): { best: number; worst: number } {
  let best = 0
  let worst = 0
  values.forEach((v, i) => {
    if (v > values[best]!) best = i
    if (v < values[worst]!) worst = i
  })
  return { best, worst }
}

/** The GP with the highest median (the first on ties). */
export function easiestGp(medians: readonly number[]): number {
  let best = 0
  medians.forEach((v, i) => {
    if (v > medians[best]!) best = i
  })
  return best
}

/** `ceil(max / 10) × 10` for a points axis (at least 20). */
export function axisMax(max: number, step = 10): number {
  return Math.max(2 * step, Math.ceil(max / step) * step)
}

// --- R4: honours ---------------------------------------------------------------------------

export interface SeasonStanding {
  seasonId: number
  /** «2025». */
  label: string
  closed: boolean
  played: number
  total: number
  /** Final table, first first. */
  table: { id: number; name: string; you: boolean; pos: number; total: number; wins: number }[]
}

export interface Medal {
  id: number
  name: string
  you: boolean
  gold: number
  silver: number
  bronze: number
  wins: number
}

/** Medals only count closed seasons; wins count every season (the current one too). */
export function buildMedals(seasons: readonly SeasonStanding[]): Medal[] {
  const out = new Map<number, Medal>()
  const get = (r: { id: number; name: string; you: boolean }) => {
    let m = out.get(r.id)
    if (!m)
      out.set(
        r.id,
        (m = { id: r.id, name: r.name, you: r.you, gold: 0, silver: 0, bronze: 0, wins: 0 }),
      )
    return m
  }
  for (const s of seasons) {
    for (const r of s.table) {
      const m = get(r)
      m.wins += r.wins
      if (!s.closed) continue
      if (r.pos === 1) m.gold++
      else if (r.pos === 2) m.silver++
      else if (r.pos === 3) m.bronze++
    }
  }
  return [...out.values()]
}

/** Players with a medal or at least `minWins` GP wins (the mockup uses 5; por confirmar). */
export function medalFilter(medals: readonly Medal[], minWins = 5): Medal[] {
  return medals.filter((m) => m.gold + m.silver + m.bronze > 0 || m.wins >= minWins)
}

export function medalSort(medals: readonly Medal[]): Medal[] {
  return [...medals].sort(
    (a, b) =>
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name, 'es'),
  )
}

/** «+N sobre el 2.º» and the status text of a champion card. */
export function championCard(s: SeasonStanding) {
  const first = s.table[0]
  const second = s.table[1]
  return {
    champion: first,
    margin: first && second ? `+${first.total - second.total} sobre el 2.º` : '',
    status: s.closed ? 'cerrada' : `en curso · ${s.played}/${s.total}`,
  }
}

/** Positions per season → SVG path; a missing season breaks the line (`M` again). */
export function slopePath(
  positions: readonly (number | undefined)[],
  x: (i: number) => number,
  y: (pos: number) => number,
): string {
  let pen = false
  return positions
    .map((p, i) => {
      if (p == null) {
        pen = false
        return ''
      }
      const cmd = pen ? 'L' : 'M'
      pen = true
      return `${cmd}${x(i)},${y(p)}`
    })
    .join('')
}

// --- R7: consistency -----------------------------------------------------------------------

export type Quadrant =
  'Regular y alto' | 'Regular, pero bajo' | 'Alto, pero irregular' | 'Irregular y bajo'

export interface SeriesStats {
  mean: number
  sd: number
  min: number
  max: number
  n: number
}

export function seriesStats(values: readonly number[]): SeriesStats {
  return {
    mean: mean(values),
    sd: stdDev(values),
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    n: values.length,
  }
}

/** Equal to the mean of the community goes to the high side; equal sd goes to the regular side. */
export function quadrant(mean_: number, sd: number, meanX: number, meanY: number): Quadrant {
  if (mean_ >= meanX) return sd <= meanY ? 'Regular y alto' : 'Alto, pero irregular'
  return sd <= meanY ? 'Regular, pero bajo' : 'Irregular y bajo'
}

/** 1 decimal and decimal comma: 38 → «38,0». */
export function formatDec1(v: number): string {
  return v.toFixed(1).replace('.', ',')
}

export interface Scale {
  lo: number
  hi: number
}

/** Mockup margins: x0 = min·0.94, x1 = max·1.04, y0 = min·0.9, y1 = max·1.06; never degenerate. */
export function scatterScales(means: readonly number[], sds: readonly number[]) {
  const widen = (lo: number, hi: number, a: number, b: number): Scale => {
    let l = lo * a
    let h = hi * b
    if (!(h - l > 1e-9)) {
      l = lo - 1
      h = hi + 1
    }
    return { lo: l, hi: h }
  }
  return {
    x: widen(Math.min(...means), Math.max(...means), 0.94, 1.04),
    y: widen(Math.min(...sds), Math.max(...sds), 0.9, 1.06),
  }
}

/** Marks from `ceil(x0/step) × step` up to `x1`. */
export function ticks(x0: number, x1: number, step: number): number[] {
  const out: number[] = []
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step)
    out.push(Math.round(v * 1e6) / 1e6)
  return out
}

/** Players by `sd` ascending (the most regular first), ties by name. */
export function bySd<T extends { sd: number; name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.sd - b.sd || a.name.localeCompare(b.name, 'es'))
}

// --- R8: head to head ----------------------------------------------------------------------

export function duels(a: readonly number[], b: readonly number[]) {
  let mine = 0
  let theirs = 0
  let ties = 0
  a.forEach((v, i) => {
    const d = v - (b[i] ?? 0)
    if (d > 0) mine++
    else if (d < 0) theirs++
    else ties++
  })
  return { mine, theirs, ties }
}

export function tiesText(n: number): string {
  return n === 0 ? 'sin empates' : n === 1 ? '1 empate' : `${n} empates`
}

/** The leader of the general table; the 2nd when you are the leader. */
export function defaultRival(order: readonly { id: number }[], meId: number | undefined) {
  const first = order[0]
  if (!first) return undefined
  if (first.id !== meId) return first.id
  return order[1]?.id
}

/** Cumulative text without a plus sign: 4 → «4», −3 → «−3». */
export function signedPlain(n: number): string {
  return n < 0 ? minus(n) : String(n)
}

export function finalLabel(c: number, rival: string): string {
  return c > 0 ? `+${c} para ti` : c < 0 ? `${Math.abs(c)} para ${rival}` : 'Empate'
}

/** Height of a bar in 0..1: `|d| / max(20, max|d|)`; the caller applies the 2 px minimum. */
export function barHeight(d: number, diffs: readonly number[]): number {
  const maxd = Math.max(20, ...diffs.map((x) => Math.abs(x)))
  return Math.abs(d) / maxd
}

export function cumulativeDiffs(a: readonly number[], b: readonly number[]) {
  let c = 0
  return a.map((v, i) => (c += v - (b[i] ?? 0)))
}

export interface CompareRow {
  label: string
  a: number
  b: number
  /** Bar widths in %. */
  wa: number
  wb: number
  boldA: boolean
  boldB: boolean
}

export function compareRows(a: RankPlayer, b: RankPlayer, n: number): CompareRow[] {
  const raw: [string, number, number][] = [
    ['Puntos', a.total, b.total],
    ['Media por GP', n ? Math.round(a.total / n) : 0, n ? Math.round(b.total / n) : 0],
    ['GP ganados', a.wins, b.wins],
    ['Podios en GP', a.podiums, b.podiums],
    ['Mejor GP', Math.max(0, ...a.pts), Math.max(0, ...b.pts)],
    ['Aciertos', a.hitsTotal, b.hitsTotal],
  ]
  return raw.map(([label, x, y]) => {
    const mx = Math.max(x, y, 1)
    return {
      label,
      a: x,
      b: y,
      wa: Math.round((x / mx) * 100),
      wb: Math.round((y / mx) * 100),
      boldA: x >= y,
      boldB: y >= x,
    }
  })
}

// --- R9: distribution ----------------------------------------------------------------------

export const BUCKETS = 13
export const BUCKET_SIZE = 5

/** `min(12, floor(v / 5))`: the last bucket takes everything ≥ 60. */
export function bucket(v: number): number {
  return Math.min(BUCKETS - 1, Math.max(0, Math.floor(v / BUCKET_SIZE)))
}

export function bucketLabel(i: number): string {
  return `${i * BUCKET_SIZE}–${i * BUCKET_SIZE + BUCKET_SIZE - 1}`
}

export function histogram(values: readonly number[]): number[] {
  const out = new Array<number>(BUCKETS).fill(0)
  for (const v of values) out[bucket(v)]!++
  return out
}

/** `ceil(max / 10) × 10`, at least 10. */
export function histScale(counts: readonly number[]): number {
  return Math.max(10, Math.ceil(Math.max(0, ...counts) / 10) * 10)
}

export function playerSummary(values: readonly number[], threshold = 40) {
  return {
    min: values.length ? Math.min(...values) : 0,
    median: median(values),
    max: values.length ? Math.max(...values) : 0,
    above: values.filter((v) => v > threshold).length,
  }
}

/** Histogram normalised to its own peak (peak = 1). */
export function normalisedCurve(values: readonly number[]): number[] {
  const h = histogram(values)
  const peak = Math.max(...h)
  return h.map((c) => (peak > 0 ? c / peak : 0))
}

// --- R10: heat map -------------------------------------------------------------------------

export type HeatMetric = 'pct' | 'rank' | 'hits'

/** `sq{k+1}` with `k = clamp(floor(t^1.6 × 6.99), 0, 6)`. */
export function heatClass(t: number): number {
  return Math.min(6, Math.max(0, Math.floor(Math.max(0, t) ** 1.6 * 6.99))) + 1
}

export const tPct = (p: number, maxGp: number): number => (maxGp > 0 ? p / maxGp : 0)
export const tRank = (place: number, members: number): number =>
  members > 1 ? 1 - (place - 1) / (members - 1) : 1
export const tHits = (hits: number, maxHits: number): number => (maxHits > 0 ? hits / maxHits : 0)

/** Population sd of the player's `t` series: ascending = more regular first. */
export function regularity(ts: readonly number[]): number {
  return stdDev(ts)
}

export function sideBar(total: number, leader: number, cons: boolean, sd: number) {
  return cons
    ? { width: Math.round(Math.max(4, 100 - sd * 300)), text: `σ ${Math.round(sd * 100)}` }
    : { width: leader > 0 ? Math.round((100 * total) / leader) : 0, text: String(total) }
}

export function heatLegend(m: HeatMetric): { lo: string; hi: string } {
  return {
    pct: { lo: '0 %', hi: t('ranking.heat.winner') },
    rank: { lo: t('ranking.heat.last'), hi: '1.º' },
    hits: { lo: '0', hi: t('ranking.heat.hits') },
  }[m]
}

/** «Australia: 42 pts, 3.º del GP». */
export function cellTooltip(gp: string, pts: number, place: number): string {
  return `${gp}: ${pts} pts, ${place}.º del GP`
}

// --- R11 / R13: sessions -------------------------------------------------------------------

export type SessionKind = 'cs' | 'sp' | 'q' | 'r'

/** Order of the R11 legend (and of R13 once the qualifying is moved first). */
export const KINDS_R11: readonly SessionKind[] = ['cs', 'sp', 'q', 'r']
export const KINDS_R13: readonly SessionKind[] = ['q', 'cs', 'sp', 'r']

export const KIND_SHORT: Record<SessionKind, string> = {
  cs: 'Clasif. sprint',
  sp: 'Sprint',
  q: 'Clasificación',
  r: 'Carrera',
}
export const KIND_LONG: Record<SessionKind, string> = {
  cs: 'Clasificación sprint',
  sp: 'Sprint',
  q: 'Clasificación',
  r: 'Carrera',
}

function kindOfText(text: string): SessionKind | undefined {
  const t = text.trim().toLowerCase()
  if (!t) return undefined
  const sprint = /sprint/.test(t)
  if (sprint && /(clasif|qualif|shootout)/.test(t)) return 'cs'
  if (sprint) return 'sp'
  if (/(clasif|qualif)/.test(t)) return 'q'
  if (/(carrera|race)/.test(t)) return 'r'
  const codes: Record<string, SessionKind> = { sq: 'cs', sr: 'sp', s: 'sp', q: 'q', r: 'r' }
  return codes[t]
}

/**
 * Type of session behind a key of `pointsBySession` / `hitsBySession`. The real API names them
 * like the resume does («Carrera», «Clasificación Sprint»...); the spec does not say, so ids,
 * keys, codes and names of the GP's sessions are tried too (por confirmar).
 */
export function kindOfKey(key: string, sessions: RankGp['sessions'] = []): SessionKind | undefined {
  const byText = kindOfText(key)
  if (byText) return byText
  // Verified against a local backend: the keys are the sessions' `key` (1 = qualifying, 2 = race).
  const s =
    sessions.find((x) => x.key != null && String(x.key) === key) ??
    sessions.find((x) => sessionKeys(x).includes(key))
  return s ? (kindOfText(s.code ?? '') ?? kindOfText(s.name ?? '')) : undefined
}

export type ByKind = Record<SessionKind, number>
const zero = (): ByKind => ({ cs: 0, sp: 0, q: 0, r: 0 })

/** Sums a `…BySession` map by session type. */
export function sumByKind(map: Record<string, number>, gp: Pick<RankGp, 'sessions'>): ByKind {
  const out = zero()
  for (const [key, v] of Object.entries(map)) {
    const k = kindOfKey(key, gp.sessions)
    if (k) out[k] += v
  }
  return out
}

/** Hits of a player by session type over the whole season. */
export function seasonByKind(
  p: RankPlayer,
  model: Pick<RankModel, 'played'>,
  field: 'bySession' | 'hitsBySession',
): ByKind {
  const out = zero()
  model.played.forEach((gp, g) => {
    const v = sumByKind(p[field][g] ?? {}, gp)
    for (const k of KINDS_R11) out[k] += v[k]
  })
  return out
}

/** Positions predicted in a session of a GP according to the rule set. */
export function predictedIn(
  gp: Pick<RankGp, 'sessions'>,
  kind: SessionKind,
  rules: RuleSetData | undefined,
): number {
  let total = 0
  for (const s of gp.sessions) {
    if ((kindOfText(s.code ?? '') ?? kindOfText(s.name ?? '')) !== kind) continue
    for (const k of sessionKeys(s)) {
      const v = Number(rules?.predictedPositions?.[k])
      if (Number.isFinite(v)) {
        total += v
        break
      }
    }
  }
  return total
}

/** Attempts per type = predicted positions × GPs played with that session. */
export function attempts(
  gps: readonly Pick<RankGp, 'sessions'>[],
  rules: RuleSetData | undefined,
): ByKind {
  const out = zero()
  for (const gp of gps) for (const k of KINDS_R11) out[k] += predictedIn(gp, k, rules)
  return out
}

/** `round(total / Σ attempts × 100)`; `undefined` when there are no attempts. */
export function overallRate(hits: ByKind, tries: ByKind): number | undefined {
  const t = KINDS_R11.reduce((s, k) => s + tries[k], 0)
  const h = KINDS_R11.reduce((s, k) => s + hits[k], 0)
  return t > 0 ? Math.round((h / t) * 100) : undefined
}

/** Rate of one type in 0..1, `undefined` for 0 attempts (shown as «—», never «best»). */
export function rateOf(hits: number, tries: number): number | undefined {
  return tries > 0 ? hits / tries : undefined
}

export const dotSize = (rate: number): number => Math.round(6 + rate * 40)

/** Ids of whoever has the best rate (ties all). Empty when nobody has one. */
export function bestByKind(
  rates: readonly (number | undefined)[],
  ids: readonly number[],
): number[] {
  const real = rates.filter((r): r is number => r != null)
  if (!real.length) return []
  const best = Math.max(...real)
  return ids.filter((_, i) => rates[i] === best)
}

/** «+5 pts %», «−2 pts %», «0 pts %» from percentage points. */
export function diffText(you: number, avg: number): { text: string; ok: boolean } {
  const d = Math.round(you - avg)
  return { text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} pts %`, ok: d >= 0 }
}

// R13

export type Part = SessionKind | 'bonus'
export const PARTS_R13: readonly Part[] = ['q', 'cs', 'sp', 'r', 'bonus']
export const PART_LABEL: Record<Part, string> = {
  q: 'Clasificación',
  cs: 'Clasif. sprint',
  sp: 'Sprint',
  r: 'Carrera',
  bonus: 'Bonus',
}

/** Stack of a GP (q, cs, sp, r, bonus) without the zeros. */
export function stackGp(by: ByKind, bonus: number): { part: Part; value: number }[] {
  return PARTS_R13.map((part) => ({ part, value: part === 'bonus' ? bonus : by[part] })).filter(
    (s) => s.value > 0,
  )
}

/** Community mean per GP: Σ totals / members / n. */
export function communityMean(totals: readonly number[], members: number, n: number): number {
  return members > 0 && n > 0 ? totals.reduce((s, v) => s + v, 0) / members / n : 0
}

/** Shares in %, 2 decimals; the label only from 8 %. */
export function shareOf(parts: Record<Part, number>) {
  const sum = PARTS_R13.reduce((s, p) => s + parts[p], 0)
  return PARTS_R13.map((part) => {
    const pct = sum > 0 ? (parts[part] / sum) * 100 : 0
    return {
      part,
      value: parts[part],
      pct: Math.round(pct * 100) / 100,
      label: pct >= 8 ? `${Math.round(pct)}%` : '',
    }
  })
}

/** Players by their points in ONE session type (never the bonus), top `limit`. */
export function altRanking(
  rows: readonly { id: number; name: string; you: boolean; kinds: ByKind; pos: number }[],
  kind: SessionKind,
  limit = 8,
) {
  return [...rows]
    .sort((a, b) => b.kinds[kind] - a.kinds[kind] || a.pos - b.pos)
    .slice(0, limit)
    .map((r, i) => ({ ...r, place: i + 1, points: r.kinds[kind], move: r.pos - (i + 1) }))
}

export function moveText(d: number): string {
  return d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : ''
}
