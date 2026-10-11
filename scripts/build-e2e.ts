// Production build for the E2E suite with every feature flag ON (T6).
//
// The flagged ranking screens (R3-R13) can only be tested if their flag is on in the built dist/
// (production ignores the localStorage overrides on purpose). The deployed production bundle keeps
// every flag off; "flag off" behaviour (404, no links, no requests) is covered by unit tests.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/flags/index.ts', import.meta.url), 'utf8')
const block = /export const FLAG_DEFS = \{([\s\S]*?)\} as const/.exec(source)?.[1] ?? ''
const names = [...block.matchAll(/^\s*([A-Z_]+):/gm)].flatMap((m) => (m[1] ? [m[1]] : []))
if (names.length === 0)
  throw new Error('No se han encontrado los feature flags en src/flags/index.ts')

const env: NodeJS.ProcessEnv = { ...process.env }
for (const name of names) env[`VITE_FF_${name}`] = 'true'

const result = spawnSync('pnpm', ['exec', 'vite', 'build', '--mode', 'production'], {
  stdio: 'inherit',
  env,
})
process.exit(result.status ?? 1)
