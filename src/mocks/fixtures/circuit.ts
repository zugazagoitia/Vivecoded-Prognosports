import { GrandPrixSchema } from '@/api/schemas'
import type { z } from 'zod'
import { defineFixture } from './define'
import { circuits, competition, grandPrixes, mockGrandPrix, season, users } from './index'

type GrandPrixInput = z.input<typeof GrandPrixSchema>

/** Circuit with two variants (current and an older layout), as «Marina Bay» in the mockup. */
export const TWO_VARIANT_CIRCUIT = 18
/** Mock coordinates (the shared circuits fixture has none). */
const COORDS = { latitude: 1.2914, longitude: 103.8644 }

/** `GET /circuits/{id}`: the shared fixture plus coordinates and, for one circuit, a 2nd variant. */
export function circuitDetail(id: number) {
  const circuit = circuits.find((c) => c.id === id)
  if (!circuit) return undefined
  const extra =
    id === TWO_VARIANT_CIRCUIT
      ? [
          {
            id: 2,
            circuitId: id,
            name: 'Layout 2015–2022',
            distance: 5.063,
            turns: 23,
            hasLayoutImage: true,
          },
        ]
      : []
  return {
    ...circuit,
    ...COORDS,
    variants: [
      {
        ...circuit.variants![0]!,
        name: 'Layout actual',
        distance: 4.94,
        turns: 19,
        hasLayoutImage: true,
      },
      ...extra,
    ],
  }
}

const PAST: Record<number, { seasonId: number; year: string; date: string }[]> = {
  1: [
    { seasonId: 9, year: '2025', date: '2025-10-05T13:00:00Z' },
    { seasonId: 8, year: '2024', date: '2024-09-22T13:00:00Z' },
  ],
  2: [
    { seasonId: 5, year: '2022', date: '2022-10-02T13:00:00Z' },
    { seasonId: 2, year: '2019', date: '2019-09-22T13:00:00Z' },
  ],
}

/** `GET /circuits/{c}/{v}/gps`: current-season GP (variant 1) plus past editions. */
export function variantGps(circuitId: number, variantId: number): GrandPrixInput[] {
  const circuit = circuitDetail(circuitId)
  const variant = circuit?.variants.find((v) => v.id === variantId)
  if (!circuit || !variant) return []
  const current =
    variantId === 1
      ? grandPrixes.filter((g) => g.circuit?.id === circuitId)
      : ([] as typeof grandPrixes)
  const past = (PAST[variantId] ?? []).map((p) =>
    defineFixture(
      'grandPrix',
      GrandPrixSchema,
      mockGrandPrix(circuitId, {
        id: circuitId * 1000 + Number(p.year),
        name: `GP de ${circuit.country}`,
        round: 15,
        season: { id: p.seasonId, name: p.year, totalEvents: 22 },
        circuit,
        variant,
        laps: 62,
        lastSessionDate: p.date,
        sessions: [
          {
            id: 1,
            key: 2,
            name: 'Race',
            code: 'R',
            date: p.date,
            hasGrid: true,
            hasFastLap: false,
          },
        ],
      }),
    ),
  )
  return [...current, ...past]
}

/** `GET .../points/{gp}`: scores of every member; empty for the (pending) current season. */
export function gpPoints(gpId: number, seasonId: number) {
  if (seasonId === season.id) return []
  return users.map((user) => ({
    user,
    grandPrix: undefined,
    pointsInGP: ((Number(user.id) * 7 + gpId * 3 + seasonId) % 40) + 20,
  }))
}

export const MOCK_SEASON_AVERAGE = 38.4
export { competition }
