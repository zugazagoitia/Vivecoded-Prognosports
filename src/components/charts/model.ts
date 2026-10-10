// Data transforms for the F5 chart language. Pure functions: the SVG components only draw their output.

export interface ChartGp {
  code: string
  /** Name used in labels, e.g. "Italia" (aria-label: "Fijar Gran Premio de Italia"). */
  name: string
}

export interface ChartUser {
  id: string
  name: string
  /** One value per Grand Prix, in the mode's own unit (cumulative points, points per GP...). */
  values: number[]
}

export type Tone = 'you' | 's2' | 's3' | 's4' | 's5' | 's6' | 'rest'

export interface SeriesSpec {
  id: string
  name: string
  isMe: boolean
  values: number[]
  tone: Tone
  /** Stroke width in px. */
  width: number
  opacity: number
  /** Index in the legend / colour order (you = 0). Rest items share the last slot. */
  order: number
}

export const MAX_HIGHLIGHTS = 5
const TONES: Tone[] = ['s2', 's3', 's4', 's5', 's6']
export const LABEL_GAP = 13

/**
 * Focus + context. Returns the series in PAINT order: context first (behind), highlighted ones
 * next, "you" always last (on top). "You" is always first in colour order (`series-you`),
 * highlighted users take `series-2…6` in the order given, everyone else is `series-rest`.
 */
export function buildSeries(users: ChartUser[], highlight: string[], me: string): SeriesSpec[] {
  const picked = highlight.filter((id) => id !== me).slice(0, MAX_HIGHLIGHTS)
  const rest: SeriesSpec[] = []
  const focus: SeriesSpec[] = []
  let you: SeriesSpec | undefined
  for (const u of users) {
    const base = { id: u.id, name: u.name, values: u.values }
    if (u.id === me) {
      you = { ...base, isMe: true, tone: 'you', width: 3.25, opacity: 1, order: 0 }
      continue
    }
    const i = picked.indexOf(u.id)
    if (i >= 0) {
      focus[i] = {
        ...base,
        isMe: false,
        tone: TONES[i] as Tone,
        width: 2.1,
        opacity: 1,
        order: i + 1,
      }
    } else {
      rest.push({
        ...base,
        isMe: false,
        tone: 'rest',
        width: 1.25,
        opacity: 0.55,
        order: MAX_HIGHLIGHTS + 1,
      })
    }
  }
  return [...rest, ...focus.filter(Boolean), ...(you ? [you] : [])]
}

/** Highlighted series (you + chosen), in colour order. */
export function focusSeries(series: SeriesSpec[]): SeriesSpec[] {
  return series.filter((s) => s.tone !== 'rest').sort((a, b) => a.order - b.order)
}

/** Running total per user (the "Acumulado" mode from per-GP points). */
export function cumulate(users: ChartUser[]): ChartUser[] {
  return users.map((u) => {
    let sum = 0
    return { ...u, values: u.values.map((v) => (sum += v)) }
  })
}

/**
 * Direct-label placement: given desired y positions (any order) returns adjusted positions in the
 * same order such that no two are closer than `minGap`. Optional bounds keep the stack in view.
 */
export function placeLabels(
  ys: number[],
  minGap = LABEL_GAP,
  min?: number,
  max?: number,
): number[] {
  const idx = ys.map((_, i) => i).sort((a, b) => (ys[a] as number) - (ys[b] as number))
  const out = idx.map((i) => ys[i] as number)
  if (min !== undefined && out.length) out[0] = Math.max(out[0] as number, min)
  for (let i = 1; i < out.length; i++) {
    out[i] = Math.max(out[i] as number, (out[i - 1] as number) + minGap)
  }
  if (max !== undefined && out.length && (out[out.length - 1] as number) > max) {
    out[out.length - 1] = max
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.min(out[i] as number, (out[i + 1] as number) - minGap)
    }
  }
  const res = new Array<number>(ys.length)
  idx.forEach((orig, k) => (res[orig] = out[k] as number))
  return res
}

export interface TableModel {
  columns: string[]
  rows: { id: string; name: string; isMe: boolean; cells: number[] }[]
}

/** Accessible equivalent: same numbers as the plotted series, best (last GP) first. */
export function toTable(series: SeriesSpec[], gps: ChartGp[]): TableModel {
  const last = (s: SeriesSpec) => s.values[s.values.length - 1] ?? 0
  const rows = [...series]
    .sort((a, b) => last(b) - last(a) || a.name.localeCompare(b.name, 'es'))
    .map((s) => ({ id: s.id, name: s.name, isMe: s.isMe, cells: [...s.values] }))
  return { columns: gps.map((g) => g.code), rows }
}

export function ordinal(n: number): string {
  return `${n}.º`
}

/** Headline for `role="img"`: "Marta lidera con 684 puntos; tú vas 4.º con 612." */
export function altText(series: SeriesSpec[], index?: number, unit = 'puntos'): string {
  if (!series.length) return 'Sin datos.'
  const at = (s: SeriesSpec) => s.values[index ?? s.values.length - 1] ?? 0
  const ranked = [...series].sort((a, b) => at(b) - at(a) || a.name.localeCompare(b.name, 'es'))
  const leader = ranked[0] as SeriesSpec
  const meRank = ranked.findIndex((s) => s.isMe)
  if (meRank === 0) return `Lideras con ${at(leader)} ${unit}.`
  const head = `${leader.name} lidera con ${at(leader)} ${unit}`
  if (meRank < 0) return `${head}.`
  return `${head}; tú vas ${ordinal(meRank + 1)} con ${at(ranked[meRank] as SeriesSpec)}.`
}

/** "Nice" tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (max <= min) max = min + 1
  const raw = (max - min) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
  const out: number[] = []
  for (let v = Math.floor(min / step) * step; ; v += step) {
    out.push(Math.round(v * 1e6) / 1e6)
    if (v >= max) break
  }
  return out
}

/** Rows for the pinned panel: highlighted series at GP `index`, sorted by value (desc). */
export function panelRows(series: SeriesSpec[], index: number) {
  return focusSeries(series)
    .map((s) => ({
      id: s.id,
      name: s.name,
      tone: s.tone,
      isMe: s.isMe,
      value: s.values[index] ?? 0,
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
}

/** Bar with only the free end rounded (4 px), anchored on the baseline. Handles negative values. */
export function barPath(x: number, w: number, y0: number, y1: number, r = 4): string {
  const top = Math.min(y0, y1)
  const h = Math.abs(y1 - y0)
  if (h < 0.5) return ''
  const rr = Math.min(r, w / 2, h)
  if (y1 <= y0) {
    return `M${x},${y0}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${y0}Z`
  }
  const bottom = top + h
  return `M${x},${y0}V${bottom - rr}Q${x},${bottom} ${x + rr},${bottom}H${x + w - rr}Q${x + w},${bottom} ${x + w},${bottom - rr}V${y0}Z`
}
