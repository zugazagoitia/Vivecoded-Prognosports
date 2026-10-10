import type { RuleSetPoints } from './rules'

/**
 * Static content for the public rules page.
 *
 * `GET /v2/rulesets` answers without a token but returns per-session maps
 * (`pointsByEqualsPosition: { sessionId: { position: points } }`) and has no "Clásica 2026" set,
 * so the page uses this flat set (spec P2) until the API shape for a public default is confirmed.
 * Replace `CLASSIC_RULESET` with the API value here and nothing else has to change.
 */
export const CLASSIC_RULESET: { displayname: string; data: RuleSetPoints } = {
  displayname: 'Clásica 2026',
  data: {
    pointsByEqualsPosition: 5,
    pointsByNextPosition: 3,
    pointsByPreviousPosition: 3,
    pointsByNextOfFollowingPosition: 1,
    pointsByPreviousOfPreviousPosition: 1,
    pointsIfIsNotInPodium: 0,
    pointsIfIsNotInResults: 0,
    pointsByTopScorer: 5,
  },
}

export type SessionId = 'q' | 'sq' | 's' | 'r'

/** Illustrative closing times (static, not tied to the next GP). `closes`/`available` are i18n keys. */
export const SESSIONS: readonly {
  id: SessionId
  predictedPositions: number
  closes: string
  available: 'grid' | 'sprint'
}[] = [
  { id: 'q', predictedPositions: 5, closes: 'fri1225', available: 'grid' },
  { id: 'sq', predictedPositions: 3, closes: 'fri1125', available: 'sprint' },
  { id: 's', predictedPositions: 5, closes: 'sat1155', available: 'sprint' },
  { id: 'r', predictedPositions: 8, closes: 'sun1455', available: 'grid' },
]

export interface DemoDriver {
  code: string
  name: string
  teamColor: string
}

/** Demo race (example drivers, fixed team colours; `rgb()` because hex literals are banned outside styles). */
export const DEMO_DRIVERS: Record<string, DemoDriver> = {
  NOR: { code: 'NOR', name: 'Lando Norris', teamColor: 'rgb(255 128 0)' },
  RUS: { code: 'RUS', name: 'George Russell', teamColor: 'rgb(39 196 176)' },
  LEC: { code: 'LEC', name: 'Charles Leclerc', teamColor: 'rgb(217 43 43)' },
  PIA: { code: 'PIA', name: 'Oscar Piastri', teamColor: 'rgb(255 128 0)' },
  ANT: { code: 'ANT', name: 'Kimi Antonelli', teamColor: 'rgb(39 196 176)' },
  VER: { code: 'VER', name: 'Max Verstappen', teamColor: 'rgb(58 100 216)' },
  HAM: { code: 'HAM', name: 'Lewis Hamilton', teamColor: 'rgb(217 43 43)' },
  ALO: { code: 'ALO', name: 'Fernando Alonso', teamColor: 'rgb(34 153 113)' },
  SAI: { code: 'SAI', name: 'Carlos Sainz', teamColor: 'rgb(74 143 214)' },
}

export const DEMO_RESULT: readonly string[] = [
  'NOR',
  'RUS',
  'LEC',
  'PIA',
  'ANT',
  'VER',
  'HAM',
  'ALO',
]
export const DEMO_PREDICTION: readonly string[] = [
  'NOR',
  'LEC',
  'RUS',
  'VER',
  'PIA',
  'ANT',
  'SAI',
  'HAM',
]
