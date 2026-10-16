import { z } from 'zod'

/** Shapes of the real Jolpica (Ergast-compatible; numbers as strings) and OpenF1 responses. */

const JolpicaDriver = z.object({
  permanentNumber: z.string().nullish(),
  code: z.string().nullish(),
  givenName: z.string().nullish(),
  familyName: z.string(),
})

const JolpicaRow = z.object({
  position: z.string(),
  positionText: z.string().nullish(),
  grid: z.string().nullish(),
  Driver: JolpicaDriver,
  FastestLap: z.object({ rank: z.string().nullish() }).nullish(),
})

const Race = z.object({
  season: z.string(),
  round: z.string(),
  raceName: z.string().nullish(),
  date: z.string(),
  Circuit: z
    .object({
      circuitName: z.string().nullish(),
      Location: z
        .object({ locality: z.string().nullish(), country: z.string().nullish() })
        .nullish(),
    })
    .nullish(),
  Results: z.array(JolpicaRow).optional(),
  SprintResults: z.array(JolpicaRow).optional(),
  QualifyingResults: z.array(JolpicaRow).optional(),
})

export const JolpicaRaces = z.object({
  MRData: z.object({ RaceTable: z.object({ Races: z.array(Race) }) }),
})

export const OpenF1Sessions = z.array(
  z.object({
    session_key: z.number(),
    session_name: z.string(),
    date_start: z.string(),
    circuit_short_name: z.string().nullish(),
    location: z.string().nullish(),
    country_name: z.string().nullish(),
  }),
)

export const OpenF1Result = z.array(
  z.object({ position: z.number().nullable(), driver_number: z.number() }),
)

export const OpenF1Grid = z.array(z.object({ position: z.number(), driver_number: z.number() }))

export const OpenF1Drivers = z.array(
  z.object({
    driver_number: z.number(),
    name_acronym: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string(),
  }),
)

export type JolpicaRowT = z.infer<typeof JolpicaRow>
export type JolpicaRaceT = z.infer<typeof Race>
