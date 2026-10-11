import { mean, minus, type RankModel, type RankPlayer } from './ranking'

/** Pure logic of the summary (R0), the standings (R1) and the matrix (R2). */

// --- R0: summary ---------------------------------------------------------------------------

export const FORM_LENGTH = 5

export type FormClass = 'w' | 'p' | ''

/** `w` for 1st, `p` for 2nd-3rd, empty otherwise. */
export function formCell(place: number): FormClass {
  return place === 1 ? 'w' : place <= 3 ? 'p' : ''
}

/** Places in the last `n` played GPs (oldest first) with the GP index. */
export function lastForm(p: Pick<RankPlayer, 'gpPlaces'>, n = FORM_LENGTH) {
  const start = Math.max(0, p.gpPlaces.length - n)
  return p.gpPlaces.slice(start).map((place, i) => ({ g: start + i, place, cls: formCell(place) }))
}

export interface PodiumSlot<T> {
  item: T
  /** 1, 2 or 3. */
  place: number
  height: number
}

const PODIUM_HEIGHT: Record<number, number> = { 1: 160, 2: 130, 3: 100 }

/** Visual order 2nd, 1st, 3rd with the fixed heights 130 / 160 / 100. */
export function podiumOrder<T>(top3: readonly T[]): PodiumSlot<T>[] {
  const slot = (i: number): PodiumSlot<T>[] =>
    top3[i] === undefined
      ? []
      : [{ item: top3[i], place: i + 1, height: PODIUM_HEIGHT[i + 1] as number }]
  return [...slot(1), ...slot(0), ...slot(2)]
}

/** Gap to the leader: `−total_leader + total`, never positive. */
export function gapToLeader(model: RankModel, p: RankPlayer): number {
  const lead = model.players[0]?.total ?? 0
  return lead - p.total
}

/** Maximum accumulated points of ALL players after each GP (not only of the visible series). */
export function leadAt(model: Pick<RankModel, 'players' | 'played'>): number[] {
  return model.played.map((_, g) => Math.max(0, ...model.players.map((p) => p.acc[g] ?? 0)))
}

/** `acc − leadAt` per GP: 0 for whoever leads, negative otherwise. */
export function gapToLeaderSeries(p: Pick<RankPlayer, 'acc'>, lead: readonly number[]): number[] {
  return lead.map((l, g) => (p.acc[g] ?? 0) - l)
}

/** `floor(min / step) × step` (never above 0). */
export function yAxisMin(values: readonly number[], step = 20): number {
  const min = Math.min(0, ...values)
  const v = Math.floor(min / step) * step
  return v === 0 ? 0 : v
}

/** «Líder» for 0, otherwise «−20». */
export function gapAxisLabel(v: number): string {
  return v === 0 ? 'Líder' : minus(v)
}

/** Value at the end of a line: «líder» or «−12». */
export function endValue(v: number): string {
  return v === 0 ? 'líder' : minus(v)
}

/** Bar width of a row: `round(total / leader × 100)`. */
export function pointsBarPct(total: number, leader: number): number {
  return leader > 0 ? Math.round((total / leader) * 100) : 0
}

/** Players shown in the chart of R0 / R5 / R12: the top 5 plus you (6 at most). */
export function topFiveAndMe(model: RankModel, limit = 5): RankPlayer[] {
  const top = model.players.slice(0, limit)
  return model.me && !top.includes(model.me) ? [...top, model.me] : top
}

// --- R1: standings -------------------------------------------------------------------------

export type SortKey = 'total' | 'avg' | 'wins' | 'podiums' | 'hits'

/** Sortable metrics; the columns that are not sortable go back to `total`. */
export const SORTABLE: readonly SortKey[] = ['avg', 'wins', 'podiums', 'hits', 'total']

const METRIC: Record<SortKey, (p: RankPlayer) => number> = {
  total: (p) => p.total,
  avg: (p) => p.avg,
  wins: (p) => p.wins,
  podiums: (p) => p.podiums,
  hits: (p) => p.hitsTotal,
}

/** Descending by the metric, ties by general position. `gap`/`prev`/`gp` mean «by total». */
export function sortStandings(
  rows: readonly RankPlayer[],
  key: SortKey | 'gap' | 'prev' | 'gps',
): RankPlayer[] {
  const metric = METRIC[(SORTABLE as readonly string[]).includes(key) ? (key as SortKey) : 'total']
  return [...rows].sort((a, b) => metric(b) - metric(a) || a.pos - b.pos || a.id - b.id)
}

/** Rows within ±2 places of `myPos` (3 rows when you lead). */
export function nearFilter<T extends { pos: number }>(rows: readonly T[], myPos: number, d = 2) {
  return rows.filter((r) => Math.abs(r.pos - myPos) <= d)
}

/** Points to the player above in the GENERAL table (not in the visible order); `null` for 1st. */
export function gapPrev(
  general: readonly Pick<RankPlayer, 'id' | 'total'>[],
  id: number,
): number | null {
  const i = general.findIndex((p) => p.id === id)
  if (i <= 0) return null
  return general[i - 1]!.total - general[i]!.total
}

/** Signed text of a difference to someone above: «—» when there is nobody. */
export function gapText(v: number | null): string {
  return v == null ? '—' : minus(v)
}

/** «·» when 0 (desktop), the number otherwise. */
export function dotIfZero(n: number): string {
  return n === 0 ? '·' : String(n)
}

/** Y of the position sparkline: `(rank − 1) / (members − 1) × 24 + 2`. */
export function sparkY(rank: number, members: number): number {
  return members > 1 ? ((rank - 1) / (members - 1)) * 24 + 2 : 14
}

/** Points of the sparkline in a 100×28 box (x spreads the GPs over 98 px). */
export function sparkPoints(places: readonly number[], members: number): [number, number][] {
  const n = places.length
  return places.map((r, i) => [n > 1 ? 1 + (i / (n - 1)) * 98 : 50, sparkY(r, members)])
}

/** Bar heights of the mobile detail: `round(v / max × 100)`. */
export function mbarHeights(pts: readonly number[]): number[] {
  const mx = Math.max(0, ...pts)
  return pts.map((v) => (mx > 0 ? Math.round((v / mx) * 100) : 0))
}

/** Mobile subtitle: «Líder» or «−34 del líder». */
export function gapLabel(i: number, gap: number): string {
  return i === 0 ? 'Líder' : `${minus(gap)} del líder`
}

/** Average of `pointsInGP` of ALL members in GP `g`. */
export function gpAverage(model: Pick<RankModel, 'players'>, g: number): number {
  return mean(model.players.map((p) => p.pts[g] ?? 0))
}

/** Winner(s) of a GP: the players with the most points (ties share), empty while nobody scored. */
export function gpWinners(model: Pick<RankModel, 'players'>, g: number): RankPlayer[] {
  const best = Math.max(0, ...model.players.map((p) => p.pts[g] ?? 0))
  return best > 0 ? model.players.filter((p) => (p.pts[g] ?? 0) === best) : []
}

/** Scale of the expanded bar chart: the maximum of the season (por confirmar: rules maximum). */
export function seasonMax(model: Pick<RankModel, 'players'>): number {
  return Math.max(1, ...model.players.flatMap((p) => p.pts))
}

// --- R2: matrix ----------------------------------------------------------------------------

export type Metric = 'pts' | 'acc' | 'gpRank' | 'rank' | 'hits'
export type ColorMode = 'none' | 'heat' | 'best'

export const METRICS: readonly Metric[] = ['pts', 'acc', 'gpRank', 'rank', 'hits']

/** For these metrics lower is better. */
export const lowIsBetter = (m: Metric): boolean => m === 'gpRank' || m === 'rank'

export function metricValue(p: RankPlayer, g: number, m: Metric): number {
  switch (m) {
    case 'pts':
      return p.pts[g] ?? 0
    case 'acc':
      return p.acc[g] ?? 0
    case 'gpRank':
      return p.gpPlaces[g] ?? 0
    case 'rank':
      return p.places[g] ?? 0
    default:
      return p.hits[g] ?? 0
  }
}

/** `(v − mn) / (mx − mn)`, 1 when `mx = mn`; inverted for rank metrics. */
export function normalize(v: number, mn: number, mx: number, low: boolean): number {
  const t = mx === mn ? 1 : (v - mn) / (mx - mn)
  return low ? 1 - t : t
}

/** 1..7 → `--seq-1..7`: `min(6, floor(t × 6.99)) + 1`. */
export function heatBucket(t: number): number {
  return Math.min(6, Math.max(0, Math.floor(t * 6.99))) + 1
}

/** The best of a GP gets bold; ties are all best. */
export function isBest(v: number, mn: number, mx: number, low: boolean): boolean {
  return low ? v === mn : v === mx
}

export interface MatrixCell {
  value: number
  best: boolean
  bucket: number
}

/** Cells of one GP column (one per player, in the order of `players`). */
export function matrixColumn(players: readonly RankPlayer[], g: number, m: Metric): MatrixCell[] {
  const values = players.map((p) => metricValue(p, g, m))
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const low = lowIsBetter(m)
  return values.map((value) => ({
    value,
    best: isBest(value, mn, mx, low),
    bucket: heatBucket(normalize(value, mn, mx, low)),
  }))
}

/** Last column: total of points, «3 vict.», «4.º» or sum of hits. */
export function totalCell(p: RankPlayer, m: Metric): string {
  switch (m) {
    case 'pts':
    case 'acc':
      return String(p.total)
    case 'gpRank':
      return `${p.wins} vict.`
    case 'rank':
      return `${p.pos}.º`
    default:
      return String(p.hitsTotal)
  }
}

export function totalHeader(m: Metric): string {
  return { pts: 'Puntos', acc: 'Puntos', gpRank: 'Vict.', rank: 'Ahora', hits: 'Total' }[m]
}

/** Footer: rounded mean of the GP column; empty for rank metrics. */
export function avgRow(values: readonly number[], m: Metric): string {
  return lowIsBetter(m) || !values.length ? '' : String(Math.round(mean(values)))
}

export function legendFor(m: Metric): { text: string; lo: string; hi: string } {
  const text = {
    pts: 'Puntos en cada GP',
    acc: 'Puntos acumulados tras cada GP',
    gpRank: 'Puesto obtenido en cada GP',
    rank: 'Puesto en la general tras cada GP',
    hits: 'Aciertos en cada GP',
  }[m]
  return lowIsBetter(m) ? { text, lo: 'peor', hi: 'mejor' } : { text, lo: 'menos', hi: 'más' }
}
