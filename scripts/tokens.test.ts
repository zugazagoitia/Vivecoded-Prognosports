import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkContrast, parseColor, parseTokensCss, resolved, type Theme } from './tokens-css'

const ROOT = join(import.meta.dirname, '..')

type Value = string | { light: string; dark: string }
type Entry = { name: string; value: Value }
const tokensJson = JSON.parse(
  readFileSync(join(ROOT, 'docs/design/design-system/tokens.json'), 'utf8'),
) as {
  color: { tokens: Entry[] }
  radius: { tokens: Entry[] }
  shadow: { tokens: Entry[] }
  container: { tokens: Entry[] }
}

const byName = new Map(tokensJson.color.tokens.map((t) => [t.name, t.value]))
const flat = (v: string) => v.replace(/\s+/g, '').toLowerCase()

/** Resolves a tokens.json value for a theme, following `{other-token}` references. */
function jsonValue(name: string, theme: Theme): string {
  const raw = byName.get(name)
  if (raw === undefined) throw new Error(`tokens.json: ${name} not found`)
  const v = typeof raw === 'string' ? raw : raw[theme]
  const ref = /^\{(.+)\}$/.exec(v)
  return ref ? jsonValue(ref[1] as string, theme) : v
}

/** Deliberate departures from tokens.json (accessibility), `<token>:<theme>`. Keep this list short. */
const AA_FIXES: Record<string, string> = {
  'text-muted:light': 'gray-500 is 4.4:1 on page and surface-muted',
  'text-muted:dark': 'gray-400 is 4.1:1 on surface-input',
  'on-primary:light': 'white instead of gray-light-50 (higher contrast on the primary fill)',
  'on-primary:dark': 'white instead of gray-light-50 (higher contrast on the primary fill)',
  'info:light': 'scale default is superseded by the info state token (solid, AA on white)',
  'info:dark': 'scale default is superseded by the info state token',
  'focus-ring:dark': 'brand-500 on gray-700 inputs is 1.4:1: dark uses brand-400',
}

const EXCLUDED = /^(logo-|gray-(light|dark|purpleGray)-)/
const LIGHT = resolved('light')
const DARK = resolved('dark')

describe('tokens.css <-> tokens.json parity', () => {
  const colors = tokensJson.color.tokens.filter((t) => !EXCLUDED.test(t.name))

  it.each(['light', 'dark'] as const)('colours (%s)', (theme) => {
    const vars = theme === 'light' ? LIGHT : DARK
    const mismatches: string[] = []
    for (const { name } of colors) {
      if (AA_FIXES[`${name}:${theme}`]) continue
      const css = vars.get(`--color-${name}`)
      const expected = jsonValue(name, theme)
      if (css === undefined) mismatches.push(`${name}: missing`)
      else if (flat(css) !== flat(expected))
        mismatches.push(`${name}: css ${css} != json ${expected}`)
    }
    expect(mismatches).toEqual([])
  })

  it('every AA fix names a token that exists', () => {
    for (const key of Object.keys(AA_FIXES)) {
      expect(byName.has(key.split(':')[0] as string), key).toBe(true)
    }
  })

  it('does not expose logo colours as utilities', () => {
    expect([...LIGHT.keys()].filter((k) => k.startsWith('--color-logo'))).toEqual([])
  })

  it('shape: radius, shadow and containers', () => {
    const radiusVar: Record<string, string> = {
      rounded: '--radius-sm',
      'rounded-md': '--radius-md',
      'rounded-lg': '--radius-lg',
      'rounded-full': '--radius-full',
    }
    for (const { name, value } of tokensJson.radius.tokens) {
      expect(flat(LIGHT.get(radiusVar[name] as string) ?? ''), name).toBe(flat(value as string))
    }
    for (const { name, value } of tokensJson.shadow.tokens) {
      const v = typeof value === 'string' ? { light: value, dark: value } : value
      expect(flat(LIGHT.get(`--${name}`) ?? ''), `${name} light`).toBe(flat(v.light))
      expect(flat(DARK.get(`--${name}`) ?? ''), `${name} dark`).toBe(flat(v.dark))
    }
    for (const { name, value } of tokensJson.container.tokens) {
      expect(flat(LIGHT.get(`--${name}`) ?? ''), name).toBe(flat(value as string))
    }
  })

  it('defines every semantic, state and data token the board uses', () => {
    const needed = [
      'page',
      'surface',
      'surface-muted',
      'surface-input',
      'surface-hover',
      'text-heading',
      'text-body',
      'text-muted',
      'heading',
      'body',
      'muted',
      'border',
      'border-input',
      'primary',
      'primary-hover',
      'on-primary',
      'tint',
      'tint-hover',
      'tint-fg',
      'link',
      'focus-ring',
      'card-ring',
      ...['ok', 'warn', 'err', 'info'].flatMap((s) => [s, `${s}-tint`, `${s}-fg`]),
      'series-you',
      'series-2',
      'series-3',
      'series-4',
      'series-5',
      'series-6',
      'series-rest',
      ...[1, 2, 3, 4, 5, 6, 7].map((i) => `seq-${i}`),
      'div-neg',
      'div-mid',
      'div-pos',
      ...['hit-exact', 'hit-near', 'hit-far'].flatMap((h) => [h, `${h}-fg`]),
      'gold',
      'silver',
      'bronze',
      'chart-surface',
      'axis',
      'axis-txt',
      'grid',
    ]
    expect(needed.filter((n) => !LIGHT.has(`--color-${n}`))).toEqual([])
    expect(LIGHT.has('--card-shadow') && LIGHT.has('--shadow-card')).toBe(true)
  })

  it('dark overrides only redefine tokens that exist in light', () => {
    const raw = parseTokensCss()
    for (const k of raw.dark.keys()) expect(raw.light.has(k), k).toBe(true)
  })

  it('all colour values parse', () => {
    for (const [k, v] of LIGHT)
      if (k.startsWith('--color-') && v !== 'initial')
        parseColor(v === 'currentColor' || v === 'transparent' ? '#000' : v)
  })
})

describe('contrast (WCAG AA)', () => {
  const results = checkContrast()
  it('covers both themes', () => {
    expect(new Set(results.map((r) => r.theme))).toEqual(new Set(['light', 'dark']))
  })
  it.each(
    results.map(
      (r) => [`${r.theme}: ${r.fg} on ${r.bg}${r.over ? ` over ${r.over}` : ''}`, r] as const,
    ),
  )('%s', (_label, r) => {
    expect(r.ratio).toBeGreaterThanOrEqual(r.min)
  })
})

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

describe('no hexadecimal colours outside src/styles', () => {
  const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/
  // API fixtures carry data colours (rank colour); tests and generated types are not UI.
  const SKIP = /(^src\/styles\/|^src\/mocks\/|\.test\.ts$|\.d\.ts$)/
  it('src/** is free of hex literals', () => {
    const offenders = walk(join(ROOT, 'src'))
      .map((f) => relative(ROOT, f))
      .filter((f) => /\.(vue|ts|css)$/.test(f) && !SKIP.test(f))
      .filter((f) => HEX.test(readFileSync(join(ROOT, f), 'utf8')))
    expect(offenders).toEqual([])
  })
})
