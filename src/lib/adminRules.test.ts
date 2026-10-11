import { describe, expect, it } from 'vitest'
import {
  canDelete,
  formFromRuleset,
  maxBySession,
  parseList,
  parseUsageRows,
  ruleRows,
  rulesetPayload,
  sessionKeys,
  validateRuleForm,
} from './adminRules'

const data = {
  predictedPositions: { '1': 3, '2': 5, '3': 3, '4': 5 },
  pointsByEqualsPosition: {
    '1': { '1': 5, '2': 5, '3': 5 },
    '2': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 },
    '3': { '1': 5, '2': 5, '3': 5 },
    '4': { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 },
  },
  pointsByNextPosition: { '1': 3, '2': 3, '3': 3, '4': 3 },
  pointsByTopScorer: 5,
} as never

describe('rule sets', () => {
  it('orders the session columns like a weekend', () => {
    expect(sessionKeys([{ data }])).toEqual(['3', '4', '1', '2'])
  })
  it('builds the eight rows in order with the bonus only in the race', () => {
    const keys = sessionKeys([{ data }])
    const rows = ruleRows(data, keys)
    expect(rows.map((r) => r.id)).toEqual([
      'exact',
      'next',
      'previous',
      'nextOfNext',
      'previousOfPrevious',
      'notInPodium',
      'notInResults',
      'bonus',
    ])
    expect(rows[0]?.cells['2']).toBe('5')
    expect(rows[7]?.cells).toEqual({ '3': null, '4': null, '1': null, '2': '5' })
    expect(rows[2]?.cells['1']).toBeNull()
  })
  it('max per session sums the exact points of the predicted positions', () => {
    expect(maxBySession(data, ['3', '4', '1', '2'])).toEqual({ '3': 15, '4': 25, '1': 15, '2': 25 })
    const per = {
      predictedPositions: { '1': 2 },
      pointsByEqualsPosition: { '1': { '1': 20, '2': 16, '3': 12 } },
    } as never
    expect(maxBySession(per, ['1'])).toEqual({ '1': 36 })
  })
  it('only deletes when nothing uses it', () => {
    expect(canDelete(0)).toBe(true)
    expect(canDelete(2)).toBe(false)
    expect(canDelete(undefined)).toBe(false)
  })
  it('parses usages tolerantly', () => {
    expect(
      parseUsageRows([{ name: 'Peña' }, { community: { name: 'Liga' }, season: { name: '2026' } }]),
    ).toEqual([
      { community: 'Peña', season: null, exceptions: null },
      { community: 'Liga', season: '2026', exceptions: null },
    ])
    expect(parseUsageRows(4)).toEqual([])
  })
})

describe('creation form', () => {
  const keys = ['1', '2']
  it('copies the selected set and builds the payload from lists', () => {
    const form = formFromRuleset({ data }, ['3', '4', '1', '2'])
    expect(form.cells.exact?.['1']).toBe('5, 5, 5')
    const f = formFromRuleset(undefined, keys)
    f.name = ' Mi conjunto '
    f.cells.exact['1'] = '20, 16, 12'
    f.cells.exact['2'] = '25, 20'
    f.cells.next['1'] = '2'
    f.cells.bonus['2'] = '5'
    const payload = rulesetPayload(f, keys)
    expect(payload.displayname).toBe('Mi conjunto')
    expect(payload.isPublic).toBe(true)
    expect(payload.data).toMatchObject({
      predictedPositions: { '1': 3, '2': 2 },
      pointsByEqualsPosition: { '1': { '1': 20, '2': 16, '3': 12 }, '2': { '1': 25, '2': 20 } },
      pointsByNextPosition: { '1': 2 },
      pointsByTopScorer: 5,
    })
  })
  it('rejects negatives, decimals and an empty name', () => {
    const f = formFromRuleset(undefined, keys)
    expect(validateRuleForm(f, keys).fields.name).toBeDefined()
    f.name = 'x'
    f.cells.next['1'] = '-1'
    f.cells.previous['2'] = '1.5'
    f.cells.exact['1'] = '5, x'
    const v = validateRuleForm(f, keys)
    expect(v.valid).toBe(false)
    expect(Object.keys(v.cells).sort()).toEqual(['exact:1', 'next:1', 'previous:2'])
    expect(parseList('3, 2,1')).toEqual([3, 2, 1])
    expect(parseList('')).toBeNull()
  })
})
