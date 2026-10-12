/**
 * Reads src/styles/tokens.css (F1): resolves every custom property per theme and checks
 * WCAG contrast of the declared text/background pairs. Used by tokens.test.ts and
 * `pnpm check:contrast`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Theme = 'light' | 'dark'
export type Vars = Map<string, string>
export type Rgba = { r: number; g: number; b: number; a: number }

export const TOKENS_CSS = join(import.meta.dirname, '../src/styles/tokens.css')

function declarations(body: string): [string, string][] {
  const out: [string, string][] = []
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.push([m[1] as string, (m[2] as string).trim()])
  }
  return out
}

function blockBody(css: string, selector: RegExp): string {
  const m = selector.exec(css)
  if (!m) throw new Error(`tokens.css: block ${selector} not found`)
  const start = css.indexOf('{', m.index) + 1
  let depth = 1
  let i = start
  for (; i < css.length && depth > 0; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
  }
  return css.slice(start, i - 1)
}

/** Raw (unresolved) variables of each theme; dark contains only its overrides. */
export function parseTokensCss(css = readFileSync(TOKENS_CSS, 'utf8')): Record<Theme, Vars> {
  const light: Vars = new Map(declarations(blockBody(css, /@theme\s+static\s*\{/)))
  const dark: Vars = new Map(declarations(blockBody(css, /:root\.dark\s*,/)))
  return { light, dark }
}

/** Variables of a theme with `var(--x)` references resolved (dark overlays light). */
export function resolved(theme: Theme, raw = parseTokensCss()): Vars {
  const merged: Vars = new Map(raw.light)
  if (theme === 'dark') for (const [k, v] of raw.dark) merged.set(k, v)
  const resolve = (v: string, depth = 0): string => {
    if (depth > 10) throw new Error(`tokens.css: var() cycle near ${v}`)
    return v.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const target = merged.get(name)
      if (target === undefined) throw new Error(`tokens.css: ${name} is not defined`)
      return resolve(target, depth + 1)
    })
  }
  return new Map([...merged].map(([k, v]) => [k, resolve(v)]))
}

export function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (hex) {
    const h =
      (hex[1] as string).length === 3
        ? [...(hex[1] as string)].map((c) => c + c).join('')
        : (hex[1] as string)
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v)
  if (rgba)
    return {
      r: +(rgba[1] as string),
      g: +(rgba[2] as string),
      b: +(rgba[3] as string),
      a: rgba[4] === undefined ? 1 : +rgba[4],
    }
  throw new Error(`Unsupported colour: ${value}`)
}

/** Alpha-composites `fg` over an opaque `bg`. */
export function over(fg: Rgba, bg: Rgba): Rgba {
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a)
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 }
}

function luminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

export type Pair = { fg: string; bg: string; min: number; over?: string }

const TEXT = 4.5
const NON_TEXT = 3

const SURFACES = ['page', 'surface', 'surface-muted', 'surface-input']

/** Declared text/background pairs, by token name (without `--color-`). `over` = ground under a translucent bg. */
export const PAIRS: Pair[] = [
  ...['text-heading', 'text-body', 'text-muted', 'link'].flatMap((fg) =>
    SURFACES.filter((bg) => !(fg === 'link' && bg === 'surface-input')).map((bg) => ({
      fg,
      bg,
      min: TEXT,
    })),
  ),
  { fg: 'text-heading', bg: 'surface-hover', over: 'surface', min: TEXT },
  { fg: 'text-body', bg: 'surface-hover', over: 'surface', min: TEXT },
  { fg: 'tint-fg', bg: 'tint', over: 'surface', min: TEXT },
  { fg: 'tint-fg', bg: 'tint-hover', over: 'surface', min: TEXT },
  { fg: 'on-primary', bg: 'primary', min: TEXT },
  { fg: 'on-primary', bg: 'primary-hover', min: TEXT },
  ...['ok', 'warn', 'err', 'info'].flatMap((s) => [
    { fg: s, bg: 'surface', min: TEXT },
    { fg: s, bg: 'page', min: TEXT },
    { fg: `${s}-fg`, bg: `${s}-tint`, over: 'surface', min: TEXT },
    { fg: `${s}-fg`, bg: `${s}-tint`, over: 'page', min: TEXT },
  ]),
  ...['hit-exact', 'hit-near', 'hit-far'].map((h) => ({ fg: `${h}-fg`, bg: h, min: TEXT })),
  { fg: 'axis-txt', bg: 'chart-surface', min: TEXT },
  // Non-text: focus indicator and medals against the grounds they sit on.
  ...['page', 'surface', 'surface-input'].map((bg) => ({ fg: 'focus-ring', bg, min: NON_TEXT })),
  ...['medal-gold', 'medal-silver', 'medal-bronze'].map((fg) => ({
    fg,
    bg: 'surface',
    min: NON_TEXT,
  })),
]

export type PairResult = Pair & { theme: Theme; ratio: number }

export function checkContrast(raw = parseTokensCss()): PairResult[] {
  const results: PairResult[] = []
  for (const theme of ['light', 'dark'] as const) {
    const vars = resolved(theme, raw)
    const get = (name: string) => {
      const v = vars.get(`--color-${name}`)
      if (v === undefined) throw new Error(`tokens.css: --color-${name} missing`)
      return parseColor(v)
    }
    for (const pair of PAIRS) {
      const ground = pair.over ? get(pair.over) : undefined
      const bg = ground ? over(get(pair.bg), ground) : get(pair.bg)
      const fg = over(get(pair.fg), bg)
      results.push({ ...pair, theme, ratio: contrast(fg, bg) })
    }
  }
  return results
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const results = checkContrast()
  const failing = results.filter((r) => r.ratio < r.min)
  for (const r of results) {
    const mark = r.ratio < r.min ? 'FAIL' : 'ok  '
    console.log(
      `${mark} ${r.theme.padEnd(5)} ${r.fg} on ${r.bg}${r.over ? ` (over ${r.over})` : ''}: ${r.ratio.toFixed(2)} (min ${r.min})`,
    )
  }
  if (failing.length) {
    console.error(`${failing.length} contrast pair(s) below WCAG AA`)
    process.exit(1)
  }
}
