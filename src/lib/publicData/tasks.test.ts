import { describe, expect, it } from 'vitest'
import { dayOf, publicTasks, type TaskGp, type TaskSession } from './tasks'
import race from './__fixtures__/crosscheck-jolpica-results-2025-r1.json'

/** Real 2025 round 1 dates, from the recorded Jolpica fixtures. */
const gpRace = race.MRData.RaceTable.Races[0]!
const raceAt = `${gpRace.date}T${gpRace.time}` // 2025-03-16 04:00Z

const session = (over: Partial<TaskSession>): TaskSession => ({
  id: 1,
  name: 'Race',
  code: 'R',
  date: raceAt,
  hasGrid: false,
  resultsSaved: false,
  gridSaved: false,
  ...over,
})
const gp = (sessions: TaskSession[]): TaskGp => ({ id: 10, name: 'Australia', sessions })
const at = (iso: string) => Date.parse(iso)

describe('dayOf', () => {
  it('uses the calendar day in the given time zone', () => {
    expect(dayOf('2025-03-16T23:30:00Z', 'Europe/Madrid')).toBe('2025-03-17')
    expect(dayOf('2025-03-16T23:30:00Z', 'UTC')).toBe('2025-03-16')
    expect(dayOf(null, 'UTC')).toBeNull()
  })
})

describe('publicTasks', () => {
  const base = { timeZone: 'UTC', availableInSource: new Set<number>() }

  it('offers yesterday’s result when the source has it and none is saved', () => {
    const tasks = publicTasks({
      ...base,
      now: at('2025-03-17T09:00:00Z'),
      previous: gp([session({ id: 1 })]),
      availableInSource: new Set([1]),
    })
    expect(tasks.map((t) => [t.kind, t.session.id])).toEqual([['resultAvailable', 1]])
  })

  it('offers nothing when the source has no result or the result is saved', () => {
    const now = at('2025-03-17T09:00:00Z')
    const previous = gp([session({ id: 1 })])
    expect(publicTasks({ ...base, now, previous })).toEqual([])
    expect(
      publicTasks({
        ...base,
        now,
        previous: gp([session({ id: 1, resultsSaved: true })]),
        availableInSource: new Set([1]),
      }),
    ).toEqual([])
  })

  it('ignores a race that was not yesterday', () => {
    const tasks = publicTasks({
      ...base,
      now: at('2025-03-20T09:00:00Z'),
      previous: gp([session({ id: 1 })]),
      availableInSource: new Set([1]),
    })
    expect(tasks).toEqual([])
  })

  it('flags a grid dated today that is not saved', () => {
    const next = gp([session({ id: 2, hasGrid: true })])
    const now = at('2025-03-16T12:00:00Z')
    expect(publicTasks({ ...base, now, next }).map((t) => t.kind)).toEqual(['gridToday'])
    expect(
      publicTasks({ ...base, now, next: gp([{ ...next.sessions[0]!, gridSaved: true }]) }),
    ).toEqual([])
  })

  it('flags a next-GP session without a time', () => {
    const tasks = publicTasks({
      ...base,
      now: at('2025-03-15T12:00:00Z'),
      next: gp([session({ id: 3, date: null })]),
    })
    expect(tasks.map((t) => [t.kind, t.session.id])).toEqual([['sessionNoTime', 3]])
  })
})
