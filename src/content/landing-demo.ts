// Landing demo content (P1). EXAMPLE data, not read from any endpoint: names and numbers are
// illustrative. Scoring values are those of «Clásica 2026» (5/3/1/0).
import type { SlotDriver } from '@/components/data/types'

export const DEMO_DRIVERS: Record<string, SlotDriver> = {
  NOR: { code: 'NOR', name: 'Lando Norris', teamColor: 'var(--color-series-2)' },
  VER: { code: 'VER', name: 'Max Verstappen', teamColor: 'var(--color-series-6)' },
  LEC: { code: 'LEC', name: 'Charles Leclerc', teamColor: 'var(--color-error-600)' },
  PIA: { code: 'PIA', name: 'Oscar Piastri', teamColor: 'var(--color-series-4)' },
  HAM: { code: 'HAM', name: 'Lewis Hamilton', teamColor: 'var(--color-series-5)' },
  RUS: { code: 'RUS', name: 'George Russell', teamColor: 'var(--color-series-3)' },
  ALO: { code: 'ALO', name: 'Fernando Alonso', teamColor: 'var(--color-tertiary-700)' },
}

export const DEMO_TOPN = 5

/** Real result of the demo session, positions 1 to 5. */
export const DEMO_RESULT: readonly string[] = ['NOR', 'VER', 'LEC', 'PIA', 'HAM']

export interface DemoPlayer {
  id: string
  label: string
  prediction: readonly string[]
}

export const DEMO_PLAYERS: readonly DemoPlayer[] = [
  { id: 'alex', label: 'Álex', prediction: ['NOR', 'LEC', 'VER', 'HAM', 'RUS'] },
  { id: 'marta', label: 'Marta', prediction: ['VER', 'NOR', 'PIA', 'LEC', 'HAM'] },
  { id: 'pablo', label: 'Pablo', prediction: ['LEC', 'RUS', 'NOR', 'ALO', 'VER'] },
]

export interface DemoRankingRow {
  name: string
  points: number
  isYou?: boolean
}

export const DEMO_RANKING: { afterGps: number; rows: DemoRankingRow[] } = {
  afterGps: 17,
  rows: [
    { name: 'Álex Ruiz', points: 1050, isYou: true },
    { name: 'Marta Gil', points: 1012 },
    { name: 'Pablo Mena', points: 987 },
    { name: 'Lucía Soto', points: 954 },
    { name: 'Iván Cano', points: 921 },
  ],
}

/** Season year shown when the current season cannot be read from the API. */
export const FALLBACK_SEASON_YEAR = '2026'
export const SEASON_COMPETITION = 'f1'
