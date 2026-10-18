import { z } from 'zod'

// Roster shapes (drivers, constructors, per-round results with team, OpenF1 driver colours).
// Verified against the real APIs; fixtures in __fixtures__/roster-*.json. Jolpica sends numbers
// as strings; OpenF1 sends real numbers. Lenient on optional fields: missing data is a flag, not an error.

const jolpicaDriver = z.object({
  driverId: z.string(),
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  givenName: z.string(),
  familyName: z.string(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
})

const jolpicaConstructor = z.object({
  constructorId: z.string(),
  name: z.string(),
  nationality: z.string().optional(),
})

export const jolpicaDriversRosterSchema = z.object({
  MRData: z.object({
    DriverTable: z.object({ Drivers: z.array(jolpicaDriver) }),
  }),
})

export const jolpicaConstructorsRosterSchema = z.object({
  MRData: z.object({
    ConstructorTable: z.object({ Constructors: z.array(jolpicaConstructor) }),
  }),
})

/** `{season}/{round}/results.json` and `{season}/last/results.json`: each row carries the team of that GP. */
export const jolpicaRoundResultsRosterSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(
        z.object({
          round: z.string(),
          Results: z.array(
            z.object({
              number: z.string().optional(),
              Driver: jolpicaDriver,
              Constructor: jolpicaConstructor,
            }),
          ),
        }),
      ),
    }),
  }),
})

export const openf1RosterSessionSchema = z.object({
  session_key: z.number(),
  session_name: z.string(),
  date_start: z.string(),
})

export const openf1RosterDriverSchema = z.object({
  driver_number: z.number(),
  name_acronym: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  team_name: z.string().nullable(),
  /** Hex without the leading '#', e.g. "3671C6". */
  team_colour: z.string().nullable(),
})

export type JolpicaRosterDriver = z.infer<typeof jolpicaDriver>
export type JolpicaRosterConstructor = z.infer<typeof jolpicaConstructor>
export type JolpicaRoundResult = z.infer<
  typeof jolpicaRoundResultsRosterSchema
>['MRData']['RaceTable']['Races'][number]['Results'][number]
export type OpenF1RosterDriver = z.infer<typeof openf1RosterDriverSchema>
export type OpenF1RosterSession = z.infer<typeof openf1RosterSessionSchema>
