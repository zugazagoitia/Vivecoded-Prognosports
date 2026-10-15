import { describe, expect, it } from 'vitest'
import { mockGrandPrix } from '@/mocks/fixtures'
import {
  adminGpPath,
  chipCounts,
  closedCommunities,
  closesIn,
  closeTimeLabel,
  filterRows,
  focusSession,
  gpAdminState,
  gpFormat,
  gpSchema,
  groupResults,
  isIncomplete,
  newThisWeek,
  panelTasks,
  pitCount,
  playedGps,
  prepChecks,
  prepStatus,
  prepTone,
  sectionStatus,
  sessionPhase,
  variantLabel,
  type GpListRow,
} from './adminGp'

const NOW = Date.parse('2026-07-01T12:00:00Z')
const gp = (round: number, o = {}) => mockGrandPrix(round, { hasPromoImage: true, ...o }) as never

describe('prepStatus / chips', () => {
  it('derives [sessions, drivers, image, results] and only the first three make it incomplete', () => {
    const ready = prepStatus(gp(18), { count: 22, expected: 22 })
    expect(ready).toEqual([true, true, true, false])
    expect(isIncomplete(ready)).toBe(false)
    expect(isIncomplete(prepStatus(gp(18), { count: 20, expected: 22 }))).toBe(true)
    expect(
      isIncomplete(prepStatus(gp(18, { hasPromoImage: false }), { count: 22, expected: 22 })),
    ).toBe(true)
  })

  it('results of a GP not yet played are neutral, not pending', () => {
    expect(prepTone(false, 'results', false)).toBe('neutral')
    expect(prepTone(false, 'results', true)).toBe('warn')
    expect(prepTone(false, 'image', false)).toBe('warn')
    expect(prepTone(true, 'image', false)).toBe('ok')
  })

  it('counts chips and filters with search and accent-insensitive text', () => {
    const rows: GpListRow[] = [
      { gp: gp(1), state: 'played', prep: [true, true, true, true] },
      { gp: gp(2), state: 'published', prep: [true, true, true, false] },
      { gp: gp(3), state: 'published', prep: [true, false, true, false] },
    ]
    expect(chipCounts(rows)).toEqual({ all: 3, inc: 1, ok: 1 })
    expect(filterRows(rows, '', 'inc').map((r) => r.gp.round)).toEqual([3])
    expect(filterRows(rows, '', 'ok').map((r) => r.gp.round)).toEqual([2])
    expect(filterRows(rows, 'GRAN PREMIO 2', 'all').map((r) => r.gp.round)).toEqual([2])
    expect(filterRows(rows, 'albert park', 'all').map((r) => r.gp.round)).toEqual([1])
  })

  it('formats and states', () => {
    expect(gpFormat(gp(2))).toBe('sprint')
    expect(gpFormat(gp(3))).toBe('normal')
    expect(gpAdminState(gp(1), NOW)).toBe('played')
    expect(gpAdminState(gp(20), NOW)).toBe('published')
    expect(gpAdminState(gp(20, { suspended: true }), NOW)).toBe('suspended')
  })
})

describe('panel helpers', () => {
  it('counts the new users of the last 7 days', () => {
    const users = [
      { created: '2026-06-29T00:00:00Z' },
      { created: '2026-06-20T00:00:00Z' },
      { created: null },
    ]
    expect(newThisWeek(users, NOW)).toBe(1)
  })
  it('counts closed communities and played GPs', () => {
    expect(closedCommunities([{ open: true }, { open: false }, { open: false }])).toBe(2)
    expect(playedGps([gp(1), gp(2), gp(20), gp(3, { suspended: true })], NOW)).toBe(2)
  })
  it('closesIn subtracts the 5 minute margin', () => {
    const start = new Date(NOW + (92 + 5) * 60_000).toISOString()
    expect(closesIn(start, NOW)).toEqual({ h: 1, m: 32 })
    expect(closesIn(new Date(NOW + 60_000).toISOString(), NOW)).toBeNull()
  })
  it('pitCount counts isFromPit rows', () => {
    expect(pitCount([{ isFromPit: true }, { isFromPit: false }, { isFromPit: true }])).toBe(2)
    expect(pitCount(undefined)).toBe(0)
  })
  it('builds the six checks and the tasks', () => {
    const g = gp(20, { hasPromoImage: false })
    const session = focusSession(g, NOW)
    expect(session?.hasGrid).toBe(true)
    const input = {
      gp: g,
      driverCount: 22,
      expectedDrivers: 22,
      previousName: 'Azerbaiyán',
      sameAsPrevious: true,
      grid: [{ isFromPit: true, position: 1 }] as never,
      results: [],
      session,
      now: NOW,
    }
    const checks = prepChecks(input)
    expect(checks.map((c) => c.id)).toEqual([
      'data',
      'sessions',
      'drivers',
      'image',
      'grid',
      'result',
    ])
    expect(checks.map((c) => c.state)).toEqual(['ok', 'ok', 'ok', 'pending', 'ok', 'pending'])
    expect(checks[2]?.detail).toBe('same')
    expect(checks[4]?.params.n).toBe(1)
    expect(checks[5]?.detail).toBe('notPlayed')
    const tasks = panelTasks(checks, input)
    expect(tasks.map((t) => t.kind)).toEqual(['prepare'])
    expect(tasks[0]?.missing).toEqual(['image'])
  })
})

describe('GP edit helpers', () => {
  it('closeTimeLabel uses the typographic minus', () => {
    expect(closeTimeLabel('2026-10-10T18:00:00Z', 'UTC')).toBe('17:55 (−5 min)')
  })
  it('variantLabel', () => {
    expect(variantLabel({ name: 'Layout actual', distance: 4.94 })).toBe('Layout actual (4,940 km)')
  })
  it('sectionStatus', () => {
    const s = sectionStatus(gp(18), { count: 22, expected: 22 }, false)
    expect(s).toEqual({
      datos: 'ok',
      sesiones: 'ok',
      pilotos: 'ok',
      imagen: 'ok',
      resultados: 'warn',
    })
  })
  it('sessionPhase', () => {
    const now = NOW
    expect(sessionPhase({ date: new Date(now - 3_600_000).toISOString() }, now)).toEqual({
      phase: 'finished',
      action: 'view',
    })
    expect(sessionPhase({ date: new Date(now + 3_600_000).toISOString() }, now)).toEqual({
      phase: 'open',
      action: 'edit',
    })
    expect(sessionPhase({ date: new Date(now + 60_000).toISOString() }, now).phase).toBe('closed')
  })
  it('groupResults joins the pending ones', () => {
    const g = groupResults([
      { name: 'Carrera', hasResults: true },
      { name: 'Sprint', hasResults: false },
      { name: 'Clasificación', hasResults: false },
    ])
    expect(g.saved).toEqual(['Carrera'])
    expect(g.pending.join(' · ')).toBe('Sprint · Clasificación')
  })
  it('gpSchema rejects round 0, non numeric laps and an empty name', () => {
    const ok = { name: 'GP', code: 'SIN', round: '18', circuit: '1', variant: '1', laps: '62' }
    expect(gpSchema.safeParse(ok).success).toBe(true)
    expect(gpSchema.safeParse({ ...ok, round: '0' }).success).toBe(false)
    expect(gpSchema.safeParse({ ...ok, laps: 'abc' }).success).toBe(false)
    expect(gpSchema.safeParse({ ...ok, name: ' ' }).success).toBe(false)
    expect(gpSchema.safeParse({ ...ok, code: 'sin' }).success).toBe(false)
  })
  it('adminGpPath uses the numeric competition id, never the f1 slug', () => {
    expect(adminGpPath({ id: 39 }, { competition: 'f1', season: 9 })).toBe('/admin/gps/1/9/39')
    expect(adminGpPath({ id: 39 }, { competition: 2, season: 9 })).toBe('/admin/gps/2/9/39')
  })
})
