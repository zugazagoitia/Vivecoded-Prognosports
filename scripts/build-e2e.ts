// Production build for the E2E suite with every feature flag ON (T6).
//
// The flagged ranking screens (R3-R13) can only be tested if their flag is on in the built dist/
// (production ignores the localStorage overrides on purpose). The deployed production bundle also has
// every flag on (.env.production); the all-off behaviour is covered by `e2e/*.flags-off.spec.ts` against `--flags-off`.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/flags/index.ts', import.meta.url), 'utf8')
const block = /export const FLAG_DEFS = \{([\s\S]*?)\} as const/.exec(source)?.[1] ?? ''
const names = [...block.matchAll(/^\s*([A-Z_]+):/gm)].flatMap((m) => (m[1] ? [m[1]] : []))
if (names.length === 0)
  throw new Error('No se han encontrado los feature flags en src/flags/index.ts')

// `--flags-off`: same production build with every flag off, into dist-flags-off/ (project `flags-off`).
const flagsOff = process.argv.includes('--flags-off')
const env: NodeJS.ProcessEnv = { ...process.env, VITE_SHOWCASE: 'true' }
for (const name of names) env[`VITE_FF_${name}`] = flagsOff ? 'false' : 'true'

// `--panel`: build in `beta` mode (the reviewer flag panel only mounts outside production) into
// dist-panel/, used by e2e/flag-panel.spec.ts.
const panel = process.argv.includes('--panel')
const args = ['exec', 'vite', 'build', '--mode', panel ? 'beta' : 'production']
if (flagsOff) args.push('--outDir', 'dist-flags-off')
if (panel) args.push('--outDir', 'dist-panel')
const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  env,
})
process.exit(result.status ?? 1)
