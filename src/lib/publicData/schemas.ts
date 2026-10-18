import { z } from 'zod'
import { PublicDataError } from './types'

// Shapes verified against the real APIs (fixtures in __fixtures__/). Jolpica
// (Ergast mirror) sends every number as a string; OpenF1 sends real numbers.

const intString = z.string().regex(/^\d+$/).transform(Number)

const jolpicaDriver = z.object({
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  givenName: z.string(),
  familyName: z.string(),
})

/** Common to every results row; qualifying rows carry only these. */
const jolpicaRowBase = z.object({
  position: intString,
  number: z.string().optional(),
  Driver: jolpicaDriver,
})

/** results.json and sprint.json rows add grid, status and fastest-lap data. */
export const jolpicaTimedRowSchema = jolpicaRowBase.extend({
  positionText: z.string().optional(),
  grid: intString.optional(),
  status: z.string().optional(),
  FastestLap: z.object({ rank: intString }).optional(),
})

export const jolpicaQualifyingRowSchema = jolpicaRowBase

const envelope = <R extends z.ZodType>(race: R) =>
  z.object({
    MRData: z.object({
      total: z.string(),
      RaceTable: z.object({ season: z.string(), Races: z.array(race) }),
    }),
  })

export const jolpicaResultsSchema = envelope(
  z.object({ round: z.string(), Results: z.array(jolpicaTimedRowSchema).optional() }),
)
export const jolpicaSprintSchema = envelope(
  z.object({ round: z.string(), SprintResults: z.array(jolpicaTimedRowSchema).optional() }),
)
export const jolpicaQualifyingSchema = envelope(
  z.object({
    round: z.string(),
    QualifyingResults: z.array(jolpicaQualifyingRowSchema).optional(),
  }),
)

// OpenF1 (https://api.openf1.org/v1). Its 404 "No results found" bodies are
// handled by the provider before parsing.

export const openf1MeetingSchema = z.object({
  meeting_key: z.number(),
  meeting_name: z.string(),
  date_start: z.string(),
  is_cancelled: z.boolean(),
})

export const openf1SessionSchema = z.object({
  session_key: z.number(),
  session_name: z.string(),
  session_type: z.string(),
  meeting_key: z.number(),
})

export const openf1SessionResultSchema = z.object({
  position: z.number().nullable(),
  driver_number: z.number(),
  dnf: z.boolean(),
  dns: z.boolean(),
  dsq: z.boolean(),
})

export const openf1DriverSchema = z.object({
  driver_number: z.number(),
  name_acronym: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
})

export const openf1StartingGridSchema = z.object({
  position: z.number().nullable(),
  driver_number: z.number(),
})

export type JolpicaTimedRow = z.infer<typeof jolpicaTimedRowSchema>
export type JolpicaQualifyingRow = z.infer<typeof jolpicaQualifyingRowSchema>
export type OpenF1Meeting = z.infer<typeof openf1MeetingSchema>
export type OpenF1Session = z.infer<typeof openf1SessionSchema>
export type OpenF1SessionResult = z.infer<typeof openf1SessionResultSchema>
export type OpenF1Driver = z.infer<typeof openf1DriverSchema>
export type OpenF1StartingGrid = z.infer<typeof openf1StartingGridSchema>

/** Reads and validates a response body; bad JSON or a wrong shape becomes a `parse` error. */
export async function parseResponse<T extends z.ZodType>(
  res: Response,
  schema: T,
  what: string,
  signal?: AbortSignal,
): Promise<z.output<T>> {
  let json: unknown
  try {
    json = await res.json()
  } catch {
    if (signal?.aborted) throw new PublicDataError('aborted', 'Request aborted')
    throw new PublicDataError('parse', `Invalid JSON from ${what}`)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new PublicDataError('parse', `Unexpected shape from ${what}`)
  return parsed.data
}
