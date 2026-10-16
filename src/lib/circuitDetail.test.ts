import { describe, expect, it } from 'vitest'
import {
  closesIn,
  communityWinner,
  formatAvg,
  formatKm,
  formatOneDecimal,
  gpRankOf,
  gpsWithPoints,
  historyBar,
  mapTiles,
  nextOpenSession,
  pickVariant,
  raceDistance,
  tileCoords,
} from './circuitDetail'

const pts = (id: number, name: string, pointsInGP: number) => ({
  user: { id, username: name, lifetime: 0, current: false },
  pointsInGP,
})

describe('number formats', () => {
  it('formatKm uses the decimal comma and fixed decimals', () => {
    expect(formatKm(4.94, 3)).toBe('4,940 km')
    expect(formatKm(306.28, 1)).toBe('306,3 km')
    expect(formatKm(undefined, 1)).toBe('—')
  })
  it('formatAvg gives one decimal or a dash', () => {
    expect(formatAvg([41, 28])).toBe('34,5')
    expect(formatAvg([])).toBe('—')
  })
  it('formatOneDecimal never prints -0', () => {
    expect(formatOneDecimal(-0.04)).toBe('0,0')
    expect(formatOneDecimal(38.44)).toBe('38,4')
    expect(formatOneDecimal(null)).toBe('—')
  })
  it('race distance is lap length times laps (mockup said 306,1)', () => {
    expect(formatKm(raceDistance(4.94, 62), 1)).toBe('306,3 km')
    expect(raceDistance(4.94, undefined)).toBeUndefined()
  })
})

describe('historyBar', () => {
  it('pending -> empty muted bar', () => {
    expect(historyBar(null, 62, 30)).toEqual({ pct: 0, tone: 'muted' })
  })
  it('primary from the season average up, lila below, width rounded to the GP maximum', () => {
    expect(historyBar(41, 62, 40)).toEqual({ pct: 66, tone: 'primary' })
    expect(historyBar(40, 62, 40).tone).toBe('primary')
    expect(historyBar(28, 62, 40)).toEqual({ pct: 45, tone: 'brand-300' })
    expect(historyBar(5, 0, 40).pct).toBe(0)
  })
})

describe('community results', () => {
  const list = [pts(1, 'ana', 30), pts(2, 'beto', 44), pts(3, 'carla', 41), pts(4, 'dani', 44)]
  it('gpRankOf ranks by pointsInGP desc (ties share)', () => {
    expect(gpRankOf(3, list)).toBe(3)
    expect(gpRankOf(2, list)).toBe(1)
    expect(gpRankOf(4, list)).toBe(1)
    expect(gpRankOf(9, list)).toBeUndefined()
  })
  it('communityWinner handles ties and empty lists', () => {
    expect(communityWinner(list)).toEqual({ names: ['beto', 'dani'], points: 44 })
    expect(communityWinner([])).toBeUndefined()
  })
})

describe('closesIn', () => {
  it('subtracts the 5 minute margin', () => {
    const now = Date.parse('2026-10-11T10:00:00Z')
    expect(closesIn('2026-10-11T11:37:00Z', now)).toEqual({ hours: 1, minutes: 32 })
    expect(closesIn('2026-10-11T10:04:00Z', now)).toBeUndefined()
    expect(closesIn(undefined, now)).toBeUndefined()
  })
  it('nextOpenSession returns the earliest still open', () => {
    const now = Date.parse('2026-10-11T10:00:00Z')
    const s = nextOpenSession(
      {
        sessions: [
          { id: 1, date: '2026-10-10T10:00:00Z' },
          { id: 3, date: '2026-10-12T10:00:00Z' },
          { id: 2, date: '2026-10-11T12:00:00Z' },
        ],
      },
      now,
    )
    expect(s?.id).toBe(2)
  })
})

describe('GP selection', () => {
  it('limits the points requests to the most recent past GPs', () => {
    const gps = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `GP ${i}`,
      lastSessionDate: `${2010 + i}-06-01T12:00:00Z`,
    }))
    const picked = gpsWithPoints(gps, Date.parse('2030-01-01'))
    expect(picked).toHaveLength(5)
    expect(picked[0]?.id).toBe(8)
    expect(gpsWithPoints(gps, Date.parse('2012-01-01'))).toHaveLength(2)
    expect(gpsWithPoints(gps, Date.parse('2030-01-01'), Infinity)).toHaveLength(8)
  })
  it('pickVariant falls back to the first', () => {
    const v = [{ id: 1 }, { id: 2 }]
    expect(pickVariant(v, '2')?.id).toBe(2)
    expect(pickVariant(v, 'zz')?.id).toBe(1)
    expect(pickVariant([], undefined)).toBeUndefined()
  })
})

describe('map tiles', () => {
  it('computes slippy tile coordinates', () => {
    const { x, y } = tileCoords(0, 0, 1)
    expect(x).toBeCloseTo(1)
    expect(y).toBeCloseTo(1)
  })
  it('builds CARTO urls for the theme and density, centred on the point', () => {
    const light = mapTiles(1.2914, 103.8644, 14, false, false)
    expect(light).toHaveLength(15)
    expect(light[0]?.url).toMatch(
      /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/light_all\/14\/\d+\/\d+\.png$/,
    )
    expect(mapTiles(1.2914, 103.8644, 14, true, true)[0]?.url).toMatch(/dark_all.*@2x\.png$/)
  })
})
