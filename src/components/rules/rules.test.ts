import { describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'

import { CLASSIC_RULESET, DEMO_PREDICTION, DEMO_RESULT } from './classicRuleset'
import {
  buildHint,
  formatSessionInfo,
  moveRow,
  ruleLabel,
  scorePrediction,
  type HintRow,
  type RuleSetPoints,
  type Translate,
} from './rules'

const t = i18n.global.t as unknown as Translate

describe('ruleLabel', () => {
  it.each([
    [null, 0, 'Piloto que no está en los resultados'],
    [0, 0, 'Posición exacta'],
    [1, 0, 'Posición siguiente (acaba 1 más abajo)'],
    [-1, 3, 'Posición anterior (acaba 1 más arriba)'],
    [2, 0, 'Siguiente de la siguiente (2 más abajo)'],
    [-2, 3, 'Anterior de la anterior (2 más arriba)'],
    [4, 1, 'Piloto del podio que acaba fuera del podio'],
    [3, 4, 'Más de dos posiciones de diferencia'],
  ])('d=%s k=%s', (d, k, label) => {
    expect(ruleLabel(d, k, t)).toBe(label)
  })
})

describe('scorePrediction', () => {
  const custom: RuleSetPoints = {
    pointsByEqualsPosition: 10,
    pointsByNextPosition: 4,
    pointsByPreviousPosition: 4,
    pointsByNextOfFollowingPosition: 2,
    pointsByPreviousOfPreviousPosition: 2,
    pointsIfIsNotInPodium: 1,
    pointsIfIsNotInResults: 0,
    pointsByTopScorer: 7,
  }
  it('returns points, kind and total for any rule set', () => {
    const { rows, total } = scorePrediction(
      ['A', 'B', 'C', 'D', 'X'],
      ['A', 'C', 'B', 'E', 'F', 'D'],
      custom,
    )
    expect(rows.map((r) => [r.kind, r.points])).toEqual([
      ['exact', 10],
      ['near', 4],
      ['near', 4],
      ['far', 2],
      ['miss', 0],
    ])
    expect(total).toBe(20)
  })
  it('scores the podium rule', () => {
    const { rows } = scorePrediction(['A', 'B', 'C'], ['X', 'Y', 'Z', 'W', 'V', 'B'], custom)
    expect(rows[1]?.points).toBe(1)
    expect(rows[1]?.rule).toBe('podium')
  })
  it('scores the default demo', () => {
    expect(scorePrediction(DEMO_PREDICTION, DEMO_RESULT, CLASSIC_RULESET.data).total).toBe(21)
  })
})

describe('moveRow', () => {
  it('does not change anything at the edges', () => {
    expect(moveRow(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveRow(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
  it('swaps otherwise and does not mutate', () => {
    const o = ['a', 'b', 'c']
    expect(moveRow(o, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveRow(o, 1, 1)).toEqual(['a', 'c', 'b'])
    expect(o).toEqual(['a', 'b', 'c'])
  })
})

describe('buildHint', () => {
  const row = (over: Partial<HintRow>): HintRow => ({
    position: 1,
    name: 'Lando Norris',
    finish: '1.º',
    points: 5,
    kind: 'exact',
    rule: 'Posición exacta',
    ...over,
  })
  it('uses the first near row', () => {
    const rows = [
      row({}),
      row({
        position: 2,
        name: 'George Russell',
        finish: '1.º',
        points: 3,
        kind: 'near',
        rule: 'Posición anterior (acaba 1 más arriba)',
      }),
    ]
    expect(buildHint(rows, t)).toBe(
      'Pones a Russell 2.º y acaba 1.º → 3 puntos (posición anterior (acaba 1 más arriba)).',
    )
  })
  it('falls back to the first row and pluralises', () => {
    expect(buildHint([row({ points: 1 })], t)).toBe(
      'Pones a Norris 1.º y acaba 1.º → 1 punto (posición exacta).',
    )
  })
})

describe('formatSessionInfo', () => {
  it('formats drivers and closing time', () => {
    expect(formatSessionInfo({ predictedPositions: 8, closes: 'Domingo 14:55' }, t)).toEqual({
      drivers: '8 pilotos',
      closes: 'Domingo 14:55 · 5 min antes',
    })
    expect(formatSessionInfo({ predictedPositions: 1, closes: 'x' }, t).drivers).toBe('1 piloto')
  })
})
