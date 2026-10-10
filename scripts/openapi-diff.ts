/**
 * Pure helpers to compare two OpenAPI documents (T15, requisitos §20.4).
 * The comparison is semantic: key order, array order of plain scalar lists
 * (`required`, `enum`, `tags`...) and whitespace/formatting do not count.
 */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

/** Canonical form: object keys sorted, scalar-only arrays sorted. */
export function normalise(value: Json): Json {
  if (Array.isArray(value)) {
    const items = value.map(normalise)
    const scalars = items.every((i) => i === null || typeof i !== 'object')
    return scalars ? [...items].sort((a, b) => String(a).localeCompare(String(b))) : items
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, Json> = {}
    for (const k of Object.keys(value).sort()) out[k] = normalise(value[k] as Json)
    return out
  }
  return value
}

export interface SpecChange {
  kind: 'added' | 'removed' | 'changed'
  pointer: string
  before?: string
  after?: string
  /** Heuristic: the change can break a client written against the old spec. */
  breaking: boolean
}

const DOC_ONLY = new Set([
  'description',
  'summary',
  'example',
  'examples',
  'operationId',
  'externalDocs',
])

const esc = (k: string) => k.replaceAll('~', '~0').replaceAll('/', '~1')
const isObject = (v: Json): v is { [k: string]: Json } =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const isScalar = (v: Json) => v === null || typeof v !== 'object'

/** Removing/changing a key breaks clients unless it is documentation only. */
function removalBreaks(pointer: string): boolean {
  if (pointer.startsWith('/info/')) return false
  const last = pointer.slice(pointer.lastIndexOf('/') + 1)
  // `required` loosening (an entry removed) does not break a reader.
  return !DOC_ONLY.has(last) && !pointer.includes('/required/')
}

/** A new `required` entry makes a response/request stricter. */
const additionBreaks = (pointer: string): boolean => pointer.includes('/required/')

function walk(a: Json, b: Json, pointer: string, out: SpecChange[]): void {
  if (isObject(a) && isObject(b)) {
    for (const k of Object.keys(a)) {
      const p = `${pointer}/${esc(k)}`
      if (!(k in b)) {
        out.push({
          kind: 'removed',
          pointer: p,
          before: JSON.stringify(a[k]),
          breaking: removalBreaks(p),
        })
      } else walk(a[k] as Json, b[k] as Json, p, out)
    }
    for (const k of Object.keys(b)) {
      if (k in a) continue
      const p = `${pointer}/${esc(k)}`
      out.push({
        kind: 'added',
        pointer: p,
        after: JSON.stringify(b[k]),
        breaking: additionBreaks(p),
      })
    }
    return
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.every(isScalar) && b.every(isScalar)) {
      const before = new Set(a.map(String))
      const after = new Set(b.map(String))
      for (const v of before) {
        if (after.has(v)) continue
        const p = `${pointer}/${esc(v)}`
        out.push({
          kind: 'removed',
          pointer: p,
          before: JSON.stringify(v),
          breaking: removalBreaks(p),
        })
      }
      for (const v of after) {
        if (before.has(v)) continue
        const p = `${pointer}/${esc(v)}`
        out.push({
          kind: 'added',
          pointer: p,
          after: JSON.stringify(v),
          breaking: additionBreaks(p),
        })
      }
      return
    }
    const n = Math.max(a.length, b.length)
    for (let i = 0; i < n; i++) {
      const p = `${pointer}/${i}`
      if (i >= b.length)
        out.push({ kind: 'removed', pointer: p, before: JSON.stringify(a[i]), breaking: true })
      else if (i >= a.length)
        out.push({ kind: 'added', pointer: p, after: JSON.stringify(b[i]), breaking: false })
      else walk(a[i] as Json, b[i] as Json, p, out)
    }
    return
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push({
      kind: 'changed',
      pointer: pointer || '/',
      before: JSON.stringify(a),
      after: JSON.stringify(b),
      breaking: removalBreaks(pointer),
    })
  }
}

/** Structural diff of two documents; a removed subtree is reported once, at its root. */
export function diffSpecs(before: Json, after: Json): SpecChange[] {
  const out: SpecChange[] = []
  walk(normalise(before), normalise(after), '', out)
  return out
}

/** Human-readable report, breaking changes first. */
export function formatChanges(changes: SpecChange[], limit = 200): string {
  const sorted = [...changes].sort((x, y) => Number(y.breaking) - Number(x.breaking))
  const lines = sorted.slice(0, limit).map((c) => {
    const tag = c.breaking ? 'BREAKING?' : 'info'
    if (c.kind === 'added') return `[${tag}] + ${c.pointer} = ${c.after}`
    if (c.kind === 'removed') return `[${tag}] - ${c.pointer} (was ${c.before})`
    return `[${tag}] ~ ${c.pointer}: ${c.before} -> ${c.after}`
  })
  if (sorted.length > limit) lines.push(`... and ${sorted.length - limit} more`)
  return lines.join('\n')
}
