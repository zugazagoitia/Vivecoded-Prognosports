import { z } from 'zod'

// Calendar shapes verified against the real APIs (fixtures: __fixtures__/calendar-*.json).
// Jolpica (Ergast mirror) splits date and time; sessions with no time are null or date-only.

const jolpicaSlot = z.object({ date: z.string(), time: z.string().optional() })

export const jolpicaScheduleRaceSchema = z.object({
  season: z.string(),
  round: z.string(),
  raceName: z.string(),
  date: z.string(),
  time: z.string().optional(),
  Circuit: z.object({ circuitId: z.string(), circuitName: z.string() }),
  FirstPractice: jolpicaSlot.nullish(),
  SecondPractice: jolpicaSlot.nullish(),
  ThirdPractice: jolpicaSlot.nullish(),
  SprintQualifying: jolpicaSlot.nullish(),
  Sprint: jolpicaSlot.nullish(),
  Qualifying: jolpicaSlot.nullish(),
})

export const jolpicaSeasonSchema = z.object({
  MRData: z.object({
    total: z.string(),
    RaceTable: z.object({
      season: z.string(),
      Races: z.array(jolpicaScheduleRaceSchema),
    }),
  }),
})

// OpenF1 (https://api.openf1.org/v1). `date_start` carries its own UTC offset in the real
// API; `gmt_offset` ("HH:MM:SS") is the fallback when a value has none.

export const openf1CalendarMeetingSchema = z.object({
  meeting_key: z.number(),
  meeting_name: z.string(),
  date_start: z.string(),
  is_cancelled: z.boolean(),
  gmt_offset: z.string().optional(),
})

export const openf1CalendarSessionSchema = z.object({
  session_key: z.number(),
  session_name: z.string(),
  meeting_key: z.number(),
  date_start: z.string(),
  gmt_offset: z.string().optional(),
})

export type JolpicaScheduleRace = z.infer<typeof jolpicaScheduleRaceSchema>
export type OpenF1CalendarMeeting = z.infer<typeof openf1CalendarMeetingSchema>
export type OpenF1CalendarSession = z.infer<typeof openf1CalendarSessionSchema>
