/**
 * Helpers for the live contract suite (T15, requisitos §20.9). READ-ONLY: only GET wrappers
 * of src/api are called from these tests, never anything that writes.
 *
 * Run with `pnpm test:contract` (see docs/contract-tests.md).
 */
import { ApiError } from '../errors'
import { setBaseUrl, setTokenProvider } from '../client'

const env = import.meta.env as Record<string, string | undefined>

/**
 * Origin of the API. The wrappers in src/api already include the `/v2` prefix in their paths,
 * so this is the bare origin (see the findings in docs/contract-tests.md).
 */
export const API_ORIGIN = env.CONTRACT_API_BASE_URL || 'https://api.prognosports.com'

/** Fixed reference data (requisitos §20.9). Overridable via env for another environment. */
export const REF = {
  competition: env.CONTRACT_COMPETITION || '1', // Formula 1
  season: env.CONTRACT_SEASON || '9', // 2026
  grandPrix: env.CONTRACT_GRAND_PRIX || '3', // Australian GP (round 1), already held
  session: env.CONTRACT_SESSION || '2', // Race
  community: env.CONTRACT_COMMUNITY || '1', // PrognoSports (public, open)
}

/** Token for the routes that need a session. Without it, those tests are skipped. */
export const TOKEN = env.CONTRACT_TEST_TOKEN || undefined

export function configureClient(withToken = false): void {
  setBaseUrl(API_ORIGIN)
  setTokenProvider(() => (withToken ? TOKEN : null))
}

/** A network/timeout/5xx failure that persisted after the retries: NOT a contract change. */
export class NetworkUnavailableError extends Error {
  constructor(label: string, cause: unknown) {
    super(
      `[network] ${label}: the API was unreachable after retries; this is not a contract change. ` +
        `(${cause instanceof Error ? cause.message : String(cause)})`,
    )
    this.name = 'NetworkUnavailableError'
  }
}

/** The response did not match the Zod schema: names the schema and every offending field. */
export class ContractMismatchError extends Error {
  constructor(label: string, issues: unknown) {
    const list = Array.isArray(issues)
      ? issues.map((i: { path?: PropertyKey[]; message?: string }) => {
          const field = (i.path ?? []).map(String).join('.') || '(root)'
          return `  - field "${field}": ${i.message ?? 'invalid'}`
        })
      : [`  - ${JSON.stringify(issues)}`]
    super(`[contract] ${label} no longer matches its schema:\n${list.join('\n')}`)
    this.name = 'ContractMismatchError'
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const transient = (e: unknown): boolean =>
  e instanceof ApiError &&
  (e.kind === 'network' || e.kind === 'timeout' || (e.kind === 'http' && e.status >= 500))

/**
 * Runs a (GET) wrapper with retries on transient failures. `label` names the schema and
 * route, e.g. "GrandPrixSchema[] GET /v2/gps".
 */
export async function live<T>(label: string, call: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await call()
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'contract') {
        throw new ContractMismatchError(label, e.details)
      }
      if (!transient(e)) throw e
      last = e
      if (i < attempts) await sleep(500 * 2 ** (i - 1))
    }
  }
  throw new NetworkUnavailableError(label, last)
}
