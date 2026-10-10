/**
 * Spec-drift check (T15, requisitos §20.4): compares the live OpenAPI document with the
 * versioned `api/openapi.json`.
 *
 * Usage: pnpm api:drift [--update] [--url <url>] [--file <path>]
 *
 * Exit codes: 0 no drift, 1 drift detected, 2 the live spec could not be fetched
 * (network problem: NOT a contract change).
 * `--update` additionally overwrites the versioned file with the live document
 * (the scheduled job then runs `pnpm api:types` and opens the PR).
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import process from 'node:process'
import { diffSpecs, formatChanges, type Json } from './openapi-diff'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const url = flag('--url') ?? 'https://api.prognosports.com/openapi'
const file = flag('--file') ?? 'api/openapi.json'
const update = args.includes('--update')

async function fetchSpec(attempts = 4): Promise<string> {
  let last: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
      if (res.ok) return await res.text()
      last = new Error(`HTTP ${res.status}`)
      if (res.status < 500) break
    } catch (e) {
      last = e
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1)))
  }
  throw last instanceof Error ? last : new Error(String(last))
}

let liveText: string
try {
  liveText = await fetchSpec()
} catch (e) {
  console.error(`Could not fetch ${url}: ${(e as Error).message}`)
  console.error('This is a network problem, not a contract change.')
  process.exit(2)
}

const live = JSON.parse(liveText) as Json
const versioned = JSON.parse(await readFile(file, 'utf8')) as Json
const changes = diffSpecs(versioned, live)

if (changes.length === 0) {
  console.log(`No drift: ${url} matches ${file}.`)
  process.exit(0)
}

const breaking = changes.filter((c) => c.breaking).length
const title = `API spec drift: ${changes.length} change(s)${breaking ? `, ${breaking} potentially BREAKING` : ''}`
console.error(title)
console.error(formatChanges(changes))

if (update) {
  await writeFile(file, liveText.endsWith('\n') ? liveText : `${liveText}\n`)
  console.error(`\nUpdated ${file}. Run \`pnpm api:types\` to regenerate src/api/schema.d.ts.`)
}
// Lets a CI job reuse the PR title (T11): GITHUB_OUTPUT is only set on GitHub Actions.
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `title=${title}\nbreaking=${breaking > 0}\nchanges=${changes.length}\n`,
  )
}
process.exit(1)
