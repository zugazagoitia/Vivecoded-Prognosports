/**
 * Bundle checks that size-limit cannot express (requisitos §20.8, §23.5):
 *  - every lazy route chunk <= ROUTE_LIMIT gzip (chart/map chunks get HEAVY_LIMIT);
 *  - the initial graph (entry + modulepreload from dist/index.html) never contains ECharts/MapLibre.
 * Run after `vite build`; wired into `pnpm size`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

export const ROUTE_LIMIT = 80 * 1024
export const HEAVY_LIMIT = 250 * 1024
const HEAVY_NAME = /echarts|maplibre|zrender/i
const HEAVY_CODE = /echarts|maplibre-gl|zrender/i

export function initialScripts(html: string): string[] {
  const out = new Set<string>()
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+\.js)"[^>]*>/g)) {
    if (m[1]) out.add(m[1].replace(/^\//, ''))
  }
  return [...out]
}

/** Returns a list of violations for the build in `dist` (empty = OK). */
export function check(dist: string): string[] {
  const errors: string[] = []
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const initial = new Set(initialScripts(html))
  if (initial.size === 0) errors.push('No initial scripts found in dist/index.html')
  for (const rel of initial) {
    const code = readFileSync(join(dist, rel), 'utf8')
    if (HEAVY_CODE.test(code)) {
      errors.push(
        `${rel}: the initial bundle contains ECharts/MapLibre (must be lazy chunks, §23.5)`,
      )
    }
  }
  const assets = join(dist, 'assets')
  for (const f of readdirSync(assets).filter((n) => n.endsWith('.js'))) {
    if (initial.has(`assets/${f}`)) continue
    const gz = gzipSync(readFileSync(join(assets, f))).length
    const limit = HEAVY_NAME.test(f) ? HEAVY_LIMIT : ROUTE_LIMIT
    if (gz > limit)
      errors.push(`assets/${f}: ${(gz / 1024).toFixed(1)} kB gzip > ${limit / 1024} kB`)
  }
  return errors
}

if (process.argv[1]?.endsWith('bundle-budget.ts')) {
  const errors = check(process.argv[2] ?? 'dist')
  if (errors.length) {
    console.error(errors.map((e) => `bundle-budget: ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('bundle-budget: OK')
}
