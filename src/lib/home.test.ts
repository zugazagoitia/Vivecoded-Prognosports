import { describe, expect, it } from 'vitest'
import type { UserPoints } from '@/api/schemas'
import {
  behindText,
  buildKpis,
  buildStanding,
  chartModel,
  countdownParts,
  dayParts,
  formatAvg,
  formatClosing,
  longToday,
  miniBars,
  movement,
  movementText,
  nearWindow,
  pointTicks,
  posTicks,
  rivalOf,
  separateLabels,
  sessionRowState,
  sessionStacks,
  type Standing,
} from './home'

const H = 3_600_000

describe('formatClosing / countdownParts (closing = date - 5 min)', () => {
  const now = Date.parse('2026-10-10T08:00:00Z')
  const at = (ms: number) => ({ date: new Date(now + ms + 5 * 60_000).toISOString() })
  it('formats days, hours and minutes', () => {
    expect(formatClosing(at(27 * H), now)).toBe('1 d 3 h')
    expect(formatClosing(at(H + 32 * 60_000), now)).toBe('1 h 32 min')
    expect(formatClosing(at(5 * H + 32 * 60_000), now)).toBe('5 h 32 min')
    expect(formatClosing(at(45 * 60_000), now)).toBe('45 min')
    expect(formatClosing(at(-H), now)).toBe('0 min')
  })
  it('splits into d / h / m', () => {
    expect(countdownParts(at(27 * H + 60_000), now)).toEqual({ d: 1, h: 3, m: 1 })
  })
})

describe('sessionRowState', () => {
  const base = { hasPrediction: false, closesInMs: 48 * H }
  it('finished with a prediction: done, «Hecho · 11 pts», «Ver resultados»', () => {
    const r = sessionRowState({ ...base, state: 'scored', hasPrediction: true, points: 11 })
    expect(r.row).toBe('done')
    expect(r.tag.text).toBe('Hecho · 11 pts')
    expect(r.button.label).toBe('Ver resultados')
    expect(r.button.action).toBe('resultados')
  })
  it('finished without prediction has its own text', () => {
    expect(sessionRowState({ ...base, state: 'scored' }).tag.text).toBe('Sin pronóstico')
  })
  it('closed without results has its own text', () => {
    const r = sessionRowState({ ...base, state: 'closed' })
    expect(r.kind).toBe('closed')
    expect(r.tag.text).toBe('Cerrada')
  })
  it('open and predicted: «Hecho» / «Editar»', () => {
    const r = sessionRowState({ ...base, state: 'open', hasPrediction: true, closesInMs: H })
    expect([r.row, r.tag.text, r.button.label, r.tag.color]).toEqual(['', 'Hecho', 'Editar', 'ok'])
  })
  it('open, no prediction and closing within 24 h: urgent', () => {
    const r = sessionRowState({ ...base, state: 'open', closesInMs: 90 * 60_000 })
    expect([r.row, r.tag.text, r.button.label]).toEqual(['urg', 'Cierra pronto', 'Pronosticar'])
    expect(sessionRowState({ ...base, state: 'open', closesInMs: 24 * H }).kind).toBe('urgent')
  })
  it('open, no prediction, far from closing: pending', () => {
    const r = sessionRowState({ ...base, state: 'open' })
    expect([r.row, r.tag.text, r.button.label]).toEqual(['', 'Pendiente', 'Pronosticar'])
  })
})

describe('header and day parts', () => {
  it('long date in the given zone, capitalised, no leading zero', () => {
    expect(longToday(Date.parse('2026-10-10T12:00:00Z'), 'Europe/Madrid')).toBe(
      'Sábado 10 de octubre',
    )
    expect(longToday(Date.parse('2026-10-04T23:30:00Z'), 'Europe/Madrid')).toBe(
      'Lunes 5 de octubre',
    )
  })
  it('day parts', () => {
    expect(dayParts('2026-10-10T10:00:00Z', 'Europe/Madrid')).toEqual({
      weekday: 'sáb',
      day: '10',
      time: '12:00',
    })
  })
})

describe('movement and KPI text', () => {
  it('better position = up', () => {
    expect(movementText(movement(6, 4), 'Azerbaiyán')).toBe('▲ 2 desde Azerbaiyán')
    expect(movement(6, 4).dir).toBe('up')
  })
  it('worse position = down; equal = no change; none without previous', () => {
    expect(movementText(movement(4, 6), 'Azerbaiyán')).toBe('▼ 2 desde Azerbaiyán')
    expect(movement(4, 6).dir).toBe('dn')
    expect(movementText(movement(4, 4), 'X')).toBe('= sin cambios')
    expect(movement(undefined, 4).dir).toBe('none')
  })
  it('compact version drops the GP', () => {
    expect(movementText(movement(6, 4), 'Azerbaiyán', true)).toBe('▲ 2')
  })
  it('formatAvg: one decimal with comma, integers on phones', () => {
    expect(formatAvg(37.647)).toBe('37,6')
    expect(formatAvg(38)).toBe('38,0')
    expect(formatAvg(37.647, true)).toBe('38')
  })
  it('behind the leader: «Vas líder» instead of 0, true minus on phones', () => {
    expect(behindText(12)).toBe('a 12 del líder')
    expect(behindText(0)).toBe('Vas líder')
    expect(behindText(12, true)).toBe('−12 del líder')
  })
})

// --- Standing fixtures ------------------------------------------------------------------------

/** 4 players over 3 GPs. Per-GP points: me(1) 10,10,10 / ana(2) 12,12,12 / bea(3) 5,5,5 / cris(4) 1,1,1 */
function points(
  perGp: Record<number, number[]>,
  extra: (gp: number, user: number) => Partial<UserPoints> = () => ({}),
): Record<string, UserPoints[]> {
  const out: Record<string, UserPoints[]> = {}
  const gps = Object.values(perGp)[0]!.length
  for (let i = 0; i < gps; i++) {
    out[String(100 + i)] = Object.entries(perGp).map(
      ([uid, pts]) =>
        ({
          user: { id: Number(uid), username: `u${uid}`, admin: false },
          pointsInGP: pts[i],
          ...extra(100 + i, Number(uid)),
        }) as UserPoints,
    )
  }
  return out
}
const gpsList = [0, 1, 2].map((i) => ({
  id: 100 + i,
  name: `Gran Premio ${i}`,
  code: `G${i}`,
  round: i + 1,
  sessions: [
    { id: 1000 + i * 10, code: 'Q', name: 'QUALIFY' },
    { id: 1001 + i * 10, code: 'R', name: 'RACE' },
  ],
}))
const standing = (perGp: Record<number, number[]>, extra?: Parameters<typeof points>[1]) =>
  buildStanding(points(perGp, extra), gpsList)

describe('buildStanding / KPIs', () => {
  const s = standing({ 1: [10, 10, 10], 2: [12, 12, 12], 3: [5, 5, 5], 4: [1, 1, 1] })
  it('accumulates points and orders the GPs by round', () => {
    expect(s.gps.map((g) => g.code)).toEqual(['G0', 'G1', 'G2'])
    expect(s.users.find((u) => u.id === 1)!.cum).toEqual([10, 20, 30])
  })
  it('uses accumulatedPoints when the API sends it', () => {
    const t = standing({ 1: [10, 10] }, (gp) => ({ accumulatedPoints: gp === 100 ? 7 : 99 }))
    expect(t.users[0]!.cum).toEqual([7, 99])
  })
  it('position, total, gap to the leader, averages', () => {
    const k = buildKpis(s, 1)
    expect(k.position).toBe(2)
    expect(k.total).toBe(30)
    expect(k.behind).toBe(6)
    expect(k.average).toBe(10)
    expect(k.communityAverage).toBeCloseTo((30 + 36 + 15 + 3) / 4 / 3)
    expect(k.played).toBe(3)
    expect(k.move.dir).toBe('eq')
  })
  it('won GPs: from the resume when known, else derived', () => {
    expect(buildKpis(s, 1, 2).won).toBe(2)
    expect(buildKpis(s, 1).won).toBe(0)
    expect(buildKpis(s, 2).won).toBe(3)
  })
  it('the leader is 0 points behind', () => {
    expect(buildKpis(s, 2).behind).toBe(0)
  })
  it('a season without played GPs has no KPIs', () => {
    expect(buildKpis(buildStanding({}, gpsList), 1).played).toBe(0)
  })
})

describe('nearWindow', () => {
  const twelve = (): Standing => {
    const per: Record<number, number[]> = {}
    for (let id = 1; id <= 12; id++) per[id] = [100 - id * 5]
    return buildStanding(points(per), gpsList)
  }
  it('first place: rows 1-3', () => {
    expect(nearWindow(twelve(), 1).map((r) => r.position)).toEqual([1, 2, 3])
  })
  it('4th of 12: rows 2-6', () => {
    expect(nearWindow(twelve(), 4).map((r) => r.position)).toEqual([2, 3, 4, 5, 6])
  })
  it('last place: rows 10-12', () => {
    expect(nearWindow(twelve(), 12).map((r) => r.position)).toEqual([10, 11, 12])
  })
  it('signs with U+2212, own row without difference', () => {
    const rows = nearWindow(twelve(), 4)
    expect(rows.map((r) => r.diff)).toEqual(['+10', '+5', '', '−5', '−10'])
    expect(rows.find((r) => r.me)?.diff).toBe('')
  })
  it('a tie shows 0 (never −0) and shares the position', () => {
    const rows = nearWindow(standing({ 1: [10], 2: [10], 3: [4] }), 1)
    expect(rows.map((r) => [r.position, r.diff])).toEqual([
      [1, ''],
      [1, '0'],
      [3, '−6'],
    ])
  })
})

describe('chartModel', () => {
  const s = standing({ 1: [10, 10, 10], 2: [12, 12, 12], 3: [5, 5, 5], 4: [1, 1, 1] })
  it('leader: you minus the best total (never above 0), average minus the best', () => {
    const m = chartModel(s, 1, 'leader')
    expect(m.lines[0]!.values).toEqual([-2, -4, -6])
    expect(Math.max(...m.lines[0]!.values)).toBeLessThanOrEqual(0)
    expect(m.lines[1]!.name).toBe('Media')
    expect(m.lines[1]!.dash).toBe('5 4')
    expect(m.lines[1]!.values[0]).toBeCloseTo(7 - 12)
  })
  it('rival: the player just ahead, rival minus you', () => {
    expect(rivalOf(s, 3)!.id).toBe(1)
    const m = chartModel(s, 1, 'rival')
    expect(m.rival).toBe('u2')
    expect(m.lines[0]!.values).toEqual([2, 4, 6])
    expect(m.rivalBehind).toBe(false)
  })
  it('rival when you lead: the 2nd', () => {
    expect(rivalOf(s, 2)!.id).toBe(1)
    const m = chartModel(s, 2, 'rival')
    expect(m.rival).toBe('u1')
    expect(m.rivalBehind).toBe(true)
    expect(m.lines[0]!.values).toEqual([-2, -4, -6])
  })
  it('position: your place per GP and a constant 1 for the leader', () => {
    const m = chartModel(s, 3, 'pos')
    expect(m.lines[0]!.values).toEqual([3, 3, 3])
    expect(m.lines[1]!.values).toEqual([1, 1, 1])
    expect([m.min, m.max]).toEqual([1, 4])
  })
  it('never contains -0', () => {
    const m = chartModel(s, 2, 'leader')
    expect(m.lines[0]!.values.every((v) => !Object.is(v, -0))).toBe(true)
  })
  it('is empty without data', () => {
    expect(chartModel(buildStanding({}, gpsList), 1, 'leader').lines).toEqual([])
  })
})

describe('ticks and labels', () => {
  it('step 50 above 120, else 20, never 0, negatives allowed', () => {
    expect(pointTicks(-200, 0)).toEqual([-200, -150, -100, -50])
    expect(pointTicks(-60, 40)).toEqual([-60, -40, -20, 20, 40])
    expect(pointTicks(0, 0)).toEqual([])
  })
  it('position ticks for 12 members', () => {
    expect(posTicks(12)).toEqual([1, 4, 8, 12])
    expect(posTicks(2)).toEqual([1, 2])
  })
  it('labels closer than 16 px are separated by 16 px', () => {
    expect(separateLabels([100, 108])).toEqual([100, 116])
    expect(separateLabels([100, 130])).toEqual([100, 130])
    expect(separateLabels([108, 100])).toEqual([116, 100])
  })
})

describe('sessionStacks and miniBars', () => {
  const s = standing({ 1: [30, 0, 40], 2: [20, 50, 10] }, (gp, uid) =>
    uid === 1 && gp !== 101
      ? {
          pointsBySession: {
            [String(1000 + (gp - 100) * 10)]: 10,
            [String(1001 + (gp - 100) * 10)]: 20,
          },
          bonusPoints: gp === 100 ? 5 : 0,
        }
      : {},
  )
  it('orders q, cs, sp, r, bonus and drops zero segments', () => {
    const { bars, max, hasBreakdown } = sessionStacks(s, 1, gpsList)
    expect(hasBreakdown).toBe(true)
    expect(bars[0]!.segments).toEqual([
      { key: 'q', value: 10 },
      { key: 'r', value: 20 },
      { key: 'bonus', value: 5 },
    ])
    expect(bars[1]!.segments).toEqual([])
    expect(max).toBe(35)
  })
  it('flags a missing breakdown', () => {
    expect(sessionStacks(s, 2, gpsList).hasBreakdown).toBe(false)
  })
  it('mini bars: height relative to the best GP, won only where you scored the most', () => {
    const bars = miniBars(s, 1)
    expect(bars.map((b) => b.height)).toEqual([75, 0, 100])
    expect(bars.map((b) => b.won)).toEqual([true, false, true])
  })
})
