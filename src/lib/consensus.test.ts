import { describe, expect, it } from 'vitest'
import type { Prediction, RaceResult } from '@/api/schemas'
import {
  agreePct,
  barHeights,
  consensusLabel,
  consensusRow,
  driverDistribution,
  gridPenalties,
  hitClassForPosition,
  originalBet,
  playerCount,
  tally,
} from './consensus'

const drv = (id: number, code: string) => ({ id, code, firstname: code, lastname: code }) as never
const D = {
  NOR: drv(1, 'NOR'),
  LEC: drv(2, 'LEC'),
  RUS: drv(3, 'RUS'),
  PIA: drv(4, 'PIA'),
  VER: drv(5, 'VER'),
  HAM: drv(6, 'HAM'),
} as Record<string, { id: number }>
let uid = 0
function pick(code: string, position: number, user = ++uid, username = `u${user}`) {
  return { user: { id: user, username }, driver: D[code], position } as unknown as Prediction
}
function votes(spec: Record<string, number>, position = 1): Prediction[] {
  return Object.entries(spec).flatMap(([code, n]) =>
    Array.from({ length: n }, () => pick(code, position)),
  )
}

describe('consensus logic (G4)', () => {
  it('consensusRow: top 3 + otros with widths and labels', () => {
    const preds = votes({ NOR: 5, LEC: 3, RUS: 2, PIA: 1, VER: 1 })
    const segs = consensusRow(tally(preds, 1), 12)
    expect(segs.map((s) => [s.kind, s.width, s.label])).toEqual([
      ['k1', '41.7', 'NOR 42%'],
      ['k2', '25.0', 'LEC 25%'],
      ['k3', '16.7', 'RUS 17%'],
      ['k0', '16.7', 'otros'],
    ])
  })

  it('consensusLabel: below 14 % only the code; small otros has no label', () => {
    expect(consensusLabel('NOR', (1 / 12) * 100)).toBe('NOR')
    const segs = consensusRow(tally(votes({ NOR: 8, LEC: 1, RUS: 1, PIA: 1 }), 1), 12)
    expect(segs.at(-1)).toMatchObject({ kind: 'k0', label: '' })
  })

  it('mine: own driver segment, or otros when outside the top 3', () => {
    const t = tally(votes({ NOR: 5, LEC: 3, RUS: 2, PIA: 1, VER: 1 }), 1)
    expect(consensusRow(t, 12, D.LEC!.id).map((s) => s.mine)).toEqual([false, true, false, false])
    expect(consensusRow(t, 12, D.VER!.id).map((s) => s.mine)).toEqual([false, false, false, true])
    expect(consensusRow(t, 12).some((s) => s.mine)).toBe(false)
  })

  it('ties are broken by grid order, deterministically', () => {
    const preds = votes({ LEC: 2, NOR: 2 })
    const order = new Map([
      [D.NOR!.id, 1],
      [D.LEC!.id, 2],
    ])
    expect(tally(preds, 1, order).map((v) => v.code)).toEqual(['NOR', 'LEC'])
    expect(tally(preds, 1, new Map([[D.LEC!.id, 1]])).map((v) => v.code)).toEqual(['LEC', 'NOR'])
  })

  it('hitClassForPosition', () => {
    const results = [
      { position: 1, driver: D.NOR },
      { position: 2, driver: D.LEC },
      { position: 0, driver: D.VER },
    ] as unknown as RaceResult[]
    expect(hitClassForPosition(1, D.LEC!.id, results)).toBe('hit-1')
    expect(hitClassForPosition(2, D.LEC!.id, results)).toBe('hit-ex')
    expect(hitClassForPosition(1, D.VER!.id, results)).toBe('hit-x')
    expect(hitClassForPosition(1, undefined, results)).toBe('hit-x')
  })

  it('driverDistribution and bar heights', () => {
    const preds = [
      ...votes({ LEC: 2 }, 1),
      ...votes({ LEC: 4 }, 2),
      ...votes({ LEC: 3 }, 3),
      ...votes({ NOR: 3 }, 4),
    ]
    const d = driverDistribution(preds, D.LEC!.id, 8, 12)
    expect(d.dist).toEqual([2, 4, 3, 0, 0, 0, 0, 0])
    expect(d.out).toBe(3)
    expect(barHeights([...d.dist, d.out])).toEqual([75, 150, 113, 1, 1, 1, 1, 1, 113])
  })

  it('originalBet: least voted at 1.º with voters, solo case', () => {
    const preds = [...votes({ NOR: 8, LEC: 3 }), pick('HAM', 1, 99, 'Hugo')]
    expect(originalBet(preds)).toEqual({ code: 'HAM', votes: 1, voters: ['Hugo'] })
    expect(originalBet([])).toBeUndefined()
  })

  it('agreePct: 3 of 8 -> 38', () => {
    const mine = new Map([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 9],
    ])
    const top = new Map([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ])
    expect(agreePct(mine, top, 8)).toBe(38)
    expect(agreePct(mine, top, 0)).toBe(0)
  })

  it('playerCount counts distinct users', () => {
    expect(playerCount([...votes({ NOR: 2 }), pick('LEC', 2, 1)])).toBe(3)
  })

  it('gridPenalties: notes of drivers not in the pit lane', () => {
    const g = (id: number, isFromPit: boolean, note?: string) =>
      ({ driver: drv(id, 'X'), position: id, isFromPit, note }) as never
    expect(
      gridPenalties([g(1, false), g(2, true, 'motor'), g(3, false, '3 puestos')]),
    ).toHaveLength(1)
  })
})
