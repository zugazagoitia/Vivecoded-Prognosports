import { describe, expect, test } from 'vitest'
import type { Prediction, RaceResult, RuleSetData, UserPoints } from '@/api/schemas'
import {
  bannerFor,
  breakdownRows,
  buildRows,
  bySession,
  cellFor,
  cellText,
  classified,
  closingLabel,
  deriveMoment,
  diffHit,
  diffKind,
  exactPoints,
  gpBonus,
  joinNames,
  legendFor,
  maxPossible,
  nearCount,
  pickOf,
  picksOf,
  pointsForPosition,
  pointsText,
  positionCount,
  rankWithTies,
  rulesOf,
  scorePrediction,
  sessionRank,
  sortRows,
  totalCell,
  winnersOf,
  type DriverPick,
  type Rules,
} from './results'

const MIN = 60_000
// Real-shaped session ids 1-4 (1 Q, 2 R, 3 SQ, 4 SR) without `key`.
const R = { id: 2, code: 'R', name: 'RACE' } as never
const Q = { id: 1, code: 'Q', name: 'QUALIFY' } as never

const driver = (id: number, over: object = {}) =>
  ({
    id,
    code: `D${id}`,
    firstname: `F${id}`,
    lastname: `Lname${id}`,
    team: null,
    ...over,
  }) as never

const result = (position: number, id: number) =>
  ({ position, driver: driver(id) }) as unknown as RaceResult
const pred = (position: number, id: number, userId?: number) =>
  ({
    position,
    driver: driver(id),
    ...(userId ? { user: { id: userId, username: `u${userId}` } } : {}),
  }) as unknown as Prediction

const pick = (id: number): DriverPick => ({ driverId: id, code: `D${id}`, name: `F${id}` })

const rules: Rules = {
  equals: { '1': 25, '2': 18, '3': 15 },
  next: 5,
  previous: 4,
  nextOfFollowing: 2,
  previousOfPrevious: 1,
  notInPodium: -3,
  notInResults: -5,
}

describe('moment boundaries', () => {
  const session = { date: '2026-10-17T20:00:00Z' }
  const close = Date.parse(session.date) - 5 * MIN

  test.each([
    [close - 1, false, 'pre'],
    [close, false, 'open'],
    [close + 1, false, 'open'],
    [close - 1, true, 'pre'],
    [close, true, 'res'],
  ])('now=%i hasResults=%s -> %s', (now, has, e) => {
    expect(deriveMoment(session, now, has)).toBe(e)
  })

  test('no date never closes', () => {
    expect(deriveMoment({ date: null }, 1e15, true)).toBe('pre')
  })
})

describe('results and picks', () => {
  test('classified drops the fastest lap (0) and negatives, sorts, tolerates undefined', () => {
    expect(classified(undefined)).toEqual([])
    expect(classified([])).toEqual([])
    expect(
      classified([result(3, 3), result(0, 9), result(1, 1), result(-1, 8), result(2, 2)]).map(
        (r) => r.driver.id,
      ),
    ).toEqual([1, 2, 3])
  })

  test('classified does not mutate the input', () => {
    const input = [result(2, 2), result(1, 1)]
    classified(input)
    expect(input.map((r) => r.position)).toEqual([2, 1])
  })

  test('pickOf: code fallback to surname prefix, name joins non-empty parts', () => {
    expect(pickOf(driver(1, { code: null, lastname: 'verstappen' })).code).toBe('VER')
    expect(pickOf(driver(1, { code: null, lastname: null })).code).toBe('')
    expect(pickOf(driver(1, { firstname: null, lastname: 'Norris' })).name).toBe('Norris')
    expect(pickOf(driver(1, { firstname: '', lastname: '' })).name).toBe('')
  })

  test('picksOf keys by position (last one wins on repeats); positionCount is the max', () => {
    expect(picksOf([])).toEqual({})
    const picks = picksOf([pred(1, 10), pred(3, 30), pred(1, 11)])
    expect(Object.keys(picks)).toEqual(['1', '3'])
    expect(picks[1]!.driverId).toBe(11)
    expect(positionCount([])).toBe(0)
    expect(positionCount([{ position: 3 }, { position: 8 }, { position: 5 }])).toBe(8)
  })
})

describe('rule sets', () => {
  test('bySession tries id, key, code and name in any case, skipping empty values', () => {
    const s = (over: object) => ({ id: 2, key: null, code: 'R', name: 'RACE', ...over }) as never
    expect(bySession(null, s({}))).toBeUndefined()
    expect(bySession(undefined, s({}))).toBeUndefined()
    expect(bySession({}, s({}))).toBeUndefined()
    expect(bySession({ '2': 1 }, s({}))).toBe(1)
    expect(bySession({ r: 2 }, s({ id: 99 }))).toBe(2)
    expect(bySession({ race: 3 }, s({ id: 99, code: '' }))).toBe(3)
    expect(bySession({ RACE: 4 }, s({ id: 99, code: null }))).toBe(4)
    expect(bySession({ '7': 5 }, s({ id: 99, key: 7 }))).toBe(5)
    expect(bySession({ '0': 9 }, s({ id: 0 }))).toBe(9)
    expect(bySession({ X: 1 }, s({}))).toBeUndefined()
    // a falsy value is still a value
    expect(bySession({ '2': 0 }, s({}))).toBe(0)
  })

  test('rulesOf: undefined without data; empty equals when the session has none', () => {
    expect(rulesOf(null, R)).toBeUndefined()
    expect(rulesOf(undefined, R)).toBeUndefined()
    const r = rulesOf({}, R)!
    expect(r.equals).toEqual({})
    expect(r.predicted).toBeUndefined()
  })

  test('rulesOf: reads every map for the session and ignores non-positive predicted counts', () => {
    const data = {
      pointsByEqualsPosition: { R: { '1': 25 }, Q: { '1': 10 } },
      pointsByNextPosition: { R: 5 },
      pointsByTopScorer: 3,
      predictedPositions: { R: 0, Q: 5 },
    } as unknown as RuleSetData
    const race = rulesOf(data, R)!
    expect(race).toMatchObject({ equals: { '1': 25 }, next: 5, topScorer: 3, predicted: undefined })
    expect(rulesOf(data, Q)!.predicted).toBe(5)
    expect(rulesOf({ pointsByTopScorer: null }, R)!.topScorer).toBeUndefined()
  })

  test('exactPoints / maxPossible', () => {
    expect(exactPoints(undefined)).toBeUndefined()
    expect(exactPoints({ equals: {} })).toBeUndefined()
    expect(exactPoints(rules)).toBe(25)
    expect(exactPoints({ equals: { '1': -3, '2': -1 } })).toBe(-1)
    expect(maxPossible(undefined, 3)).toBeUndefined()
    expect(maxPossible({ equals: {} }, 3)).toBeUndefined()
    expect(maxPossible(rules, 0)).toBe(0)
    expect(maxPossible(rules, 3)).toBe(58)
    // positions without their own value use the best one
    expect(maxPossible(rules, 5)).toBe(58 + 25 + 25)
  })

  test.each([
    ['exact first', 1, 1, 25],
    ['exact without rule', 8, 8, 0],
    ['one place below', 2, 3, 5],
    ['one place above', 2, 1, 4],
    ['two below', 1, 3, 2],
    ['two above', 3, 1, 1],
    ['podium to outside', 2, 6, -3],
    ['podium to just outside is "next"', 3, 4, 5],
    ['not on podium to far', 5, 9, 0],
    ['not classified', 1, undefined, -5],
    ['not classified, no rule', 1, undefined, 0],
  ])('pointsForPosition: %s', (name, predicted, real, expected) => {
    const r = name.endsWith('no rule') ? { equals: {} } : rules
    expect(pointsForPosition(r, predicted, real)).toBe(expected)
  })

  test('missing optional rules score 0', () => {
    const r: Rules = { equals: { '1': 25 } }
    for (const real of [2, 0.5, 3, -1]) expect(pointsForPosition(r, 1, real)).toBe(0)
  })
})

describe('scorePrediction', () => {
  const picks = { 1: pick(10), 2: pick(20), 3: pick(30), 4: pick(40) }

  test('perfect, partial and empty predictions', () => {
    const perfect = [result(1, 10), result(2, 20), result(3, 30), result(4, 40)]
    expect(scorePrediction(picks, perfect, rules)).toMatchObject({ total: 58, exacts: 4, near: 0 })
    expect(scorePrediction({}, perfect, rules)).toEqual({
      total: 0,
      byPosition: {},
      exacts: 0,
      near: 0,
    })
    expect(scorePrediction(picks, [], rules).total).toBe(-5 * 4)
  })

  test('swapped drivers count as near and fastest lap row is ignored', () => {
    const r = [result(0, 10), result(1, 20), result(2, 10 + 0), result(3, 30)]
    const s = scorePrediction({ 1: pick(10), 2: pick(20) }, r, rules)
    // driver 10 appears at 0 (ignored) and 2 -> predicted 1, real 2 (next); driver 20 -> real 1 (previous)
    expect(s.byPosition).toEqual({ 1: 5, 2: 4 })
    expect(s).toMatchObject({ total: 9, exacts: 0, near: 2 })
  })

  test('driver outside the podium, 3+ places away, is not "near"', () => {
    const s = scorePrediction({ 1: pick(10) }, [result(9, 10)], rules)
    expect(s).toMatchObject({ total: -3, near: 0, exacts: 0 })
  })
})

describe('cells', () => {
  const results = [result(1, 10), result(2, 20), result(3, 30)]

  test('before closing others are hidden, mine visible, empty is a dash', () => {
    expect(cellFor('pre', false, 1, pick(10)).kind).toBe('hidden')
    expect(cellFor('pre', false, 1, undefined).kind).toBe('hidden')
    expect(cellFor('pre', true, 1, pick(10)).kind).toBe('mine')
    expect(cellFor('pre', true, 1, undefined)).toMatchObject({ kind: 'none', code: '—' })
    expect(cellFor('open', false, 1, pick(10)).kind).toBe('visible')
    expect(cellFor('open', false, 1, undefined).kind).toBe('none')
  })

  test('with results: exact, near, far, miss and finish position', () => {
    expect(cellFor('res', false, 1, pick(10), results)).toMatchObject({
      kind: 'exact',
      finish: undefined,
    })
    expect(cellFor('res', false, 1, pick(20), results)).toMatchObject({ kind: 'near', finish: 2 })
    expect(cellFor('res', false, 1, pick(30), results)).toMatchObject({ kind: 'far', finish: 3 })
    expect(cellFor('res', false, 1, pick(99), results)).toMatchObject({
      kind: 'miss',
      finish: undefined,
    })
    expect(cellFor('res', false, 1, pick(10)).kind).toBe('miss')
  })

  test('cellText is non-empty and distinct for every kind', () => {
    const cells = [
      cellFor('pre', false, 1, pick(10)),
      cellFor('pre', true, 1, pick(10)),
      cellFor('pre', true, 1, undefined),
      cellFor('open', false, 2, pick(10)),
      cellFor('res', false, 1, pick(10), results),
      cellFor('res', false, 1, pick(20), results),
      cellFor('res', false, 1, pick(99), results),
    ]
    const texts = cells.map(cellText)
    expect(texts.every((x) => x.length > 0 && !x.startsWith('results.'))).toBe(true)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts[1]).toContain('D10')
  })
})

describe('rows, sorting and ranks', () => {
  const players = [
    { id: 1, username: 'ana' },
    { id: 2, username: 'beto' },
    { id: 3, username: 'carla' },
    { id: 4, username: 'Álvaro' },
  ]
  const results = [result(1, 10), result(2, 20), result(3, 30)]
  const base = {
    players,
    tipps: [] as Prediction[],
    results,
    userId: 1 as number | undefined,
    points: new Map<number, UserPoints>(),
    before: undefined as ReadonlyMap<number, number> | undefined,
    session: R,
    rules,
    standings: new Map<number, number>(),
  }

  test('nobody predicted: every row has no pick, sorted by name and "—" rank when scored', () => {
    const rows = buildRows({ ...base, moment: 'res' })
    expect(rows.map((r) => r.username)).toEqual(['Álvaro', 'ana', 'beto', 'carla'])
    expect(rows.every((r) => !r.hasPick && r.rank === '—' && r.points === 0)).toBe(true)
    expect(winnersOf(rows)).toEqual({ names: [], points: 0 })
  })

  test("before closing other players' predictions are never read", () => {
    const rows = buildRows({
      ...base,
      moment: 'pre',
      tipps: [pred(1, 10, 1), pred(1, 20, 2)],
      standings: new Map([
        [2, 1],
        [1, 2],
      ]),
    })
    expect(rows.map((r) => [r.username, r.hasPick])).toEqual([
      ['beto', false],
      ['ana', true],
      ['Álvaro', false],
      ['carla', false],
    ])
    expect(rows.map((r) => r.rank)).toEqual(['1.º', '2.º', '3.º', '4.º'])
  })

  test('tipps without user belong to the caller; without caller they are dropped', () => {
    const rows = buildRows({ ...base, moment: 'open', tipps: [pred(1, 10)] })
    expect(rows.find((r) => r.id === 1)!.hasPick).toBe(true)
    const anon = buildRows({ ...base, userId: undefined, moment: 'open', tipps: [pred(1, 10)] })
    expect(anon.some((r) => r.hasPick)).toBe(false)
  })

  test('scored: API points win, computed points otherwise, ties share the place', () => {
    const rows = buildRows({
      ...base,
      moment: 'res',
      userId: 2,
      tipps: [pred(1, 10, 1), pred(1, 10, 2), pred(1, 20, 3), pred(2, 30, 3)],
      points: new Map<number, UserPoints>([
        [1, { pointsBySession: { '2': 25 }, hitsBySession: { '2': 1 } } as never],
      ]),
      before: new Map([
        [1, 100],
        [2, 50],
      ]),
    })
    const by = Object.fromEntries(rows.map((r) => [r.username, r]))
    expect(by.ana).toMatchObject({ points: 25, exacts: 1, total: 125 })
    expect(by.beto).toMatchObject({ points: 25, exacts: 1, total: 75 })
    expect(by.carla).toMatchObject({ points: 10, total: 10 })
    expect(by.ana!.rank).toBe('1.º')
    expect(by.beto!.rank).toBe('1.º')
    expect(by.carla!.rank).toBe('2.º')
    expect(by.Álvaro!.rank).toBe('—')
    expect(sessionRank(rows, 3)).toBe('2.º')
    expect(sessionRank(rows, 99)).toBeUndefined()
    expect(sessionRank(rows, undefined)).toBeUndefined()
    expect(winnersOf(rows)).toEqual({ names: ['ana', 'beto'], points: 25 })
  })

  test('scored without rules and without API points leaves points undefined for pickers', () => {
    const rows = buildRows({
      ...base,
      rules: undefined,
      moment: 'res',
      tipps: [pred(1, 10, 1)],
    })
    expect(rows.find((r) => r.id === 1)!.points).toBeUndefined()
    expect(winnersOf(rows)).toEqual({ names: [], points: 0 })
  })

  test('sortRows: results order, tie-break by exacts, no-pick last, immutability', () => {
    const rows = [
      { id: 1, username: 'b', hasPick: true, points: 5, exacts: 1 },
      { id: 2, username: 'a', hasPick: true, points: 5, exacts: 2 },
      { id: 3, username: 'c', hasPick: false, points: 99 },
      { id: 4, username: 'd', hasPick: true, points: 9 },
      { id: 5, username: 'e', hasPick: true },
    ]
    const copy = [...rows]
    expect(sortRows('res', rows).map((r) => r.id)).toEqual([4, 2, 1, 5, 3])
    expect(rows).toEqual(copy)
    expect(sortRows('pre', rows, new Map([[5, 1]])).map((r) => r.id)).toEqual([5, 2, 1, 3, 4])
    expect(sortRows('open', [])).toEqual([])
  })

  test('rankWithTies: all tied, all without pick, zero points, empty', () => {
    expect(rankWithTies([])).toEqual([])
    expect(rankWithTies([{ hasPick: false }, { hasPick: false }])).toEqual(['—', '—'])
    expect(rankWithTies([0, 0, 0].map((points) => ({ hasPick: true, points })))).toEqual([
      '1.º',
      '1.º',
      '1.º',
    ])
  })

  test('rankWithTies never yields 0.º when points are unknown', () => {
    expect(rankWithTies([{ hasPick: true }, { hasPick: true }])).toEqual(['1.º', '1.º'])
  })

  test('winnersOf ignores players without a prediction and rows with 0 points', () => {
    const r = (username: string, hasPick: boolean, points?: number) =>
      ({ id: 1, username, you: false, hasPick, picks: {}, points, rank: '' }) as never
    expect(winnersOf([])).toEqual({ names: [], points: 0 })
    expect(winnersOf([r('a', false, 9), r('b', true, 0)])).toEqual({ names: [], points: 0 })
    expect(winnersOf([r('a', false, 9), r('b', true, 4), r('c', true, 4)])).toEqual({
      names: ['b', 'c'],
      points: 4,
    })
  })
})

describe('banner, legend and texts', () => {
  test.each([
    [[], 'A'.slice(0, 0)],
    [['A'], 'A'],
    [['A', 'B'], 'A y B'],
    [['A', 'B', 'C'], 'A, B y C'],
  ])('joinNames(%j)', (names, expected) => {
    expect(joinNames(names)).toBe(expected)
  })

  test.each([
    [0, '0 puntos'],
    [1, '1 punto'],
    [31, '31 puntos'],
    [-0, '0 puntos'],
    [2.5, '2,5 puntos'],
    [-4, '-4 puntos'],
  ])('pointsText(%f)', (n, e) => expect(pointsText(n).replace('−', '-')).toBe(e))

  test('closingLabel in two zones, across midnight, and without date', () => {
    const s = { date: '2026-10-18T00:03:00Z' }
    expect(closingLabel(s, 'UTC')).toEqual({ weekday: 'sábado', day: '17', time: '23:58' })
    expect(closingLabel(s, 'Europe/Madrid')).toEqual({
      weekday: 'domingo',
      day: '18',
      time: '01:58',
    })
    expect(closingLabel({ date: null }, 'UTC')).toBeNull()
    expect(closingLabel({ date: 'x' }, 'UTC')).toBeNull()
  })

  test('bannerFor: tone per moment, tie and nobody variants, missing closing', () => {
    const closing = { weekday: 'sábado', day: '17', time: '19:55' }
    expect(bannerFor('pre', { closing })).toMatchObject({ tone: 'info', icon: 'eye-slash' })
    expect(bannerFor('pre', { closing }).text).toContain('19:55')
    expect(bannerFor('pre').text).not.toBe(bannerFor('pre', { closing }).text)
    expect(bannerFor('open')).toMatchObject({ tone: 'warn', icon: 'hourglass-end' })
    const nobody = bannerFor('res')
    expect(nobody).toMatchObject({ tone: 'ok', icon: 'trophy' })
    expect(bannerFor('res', { winners: { names: [], points: 0 } }).text).toBe(nobody.text)
    const one = bannerFor('res', { winners: { names: ['Ana'], points: 31 } }).text
    expect(one).toContain('Ana')
    expect(one).toContain('31 puntos')
    const tie = bannerFor('res', { winners: { names: ['Ana', 'Beto'], points: 1 } }).text
    expect(tie).toContain('Ana y Beto')
    expect(tie).toContain('1 punto')
  })

  test('legendFor never throws and returns items for every moment', () => {
    for (const m of ['pre', 'open', 'res'] as const) {
      expect(Array.isArray(legendFor(m))).toBe(true)
      expect(Array.isArray(legendFor(m, rules))).toBe(true)
    }
    const res = legendFor('res', rules)
    expect(res.map((x) => x.key)).toEqual(expect.arrayContaining(['near', 'miss']))
    expect(legendFor('res', { equals: {} }).length).toBe(res.length)
  })
})

describe('breakdown', () => {
  test.each([
    [1, -1, 'none'],
    [1, 1, 'exact'],
    [2, 3, 'down'],
    [2, 1, 'up'],
    [1, 3, 'two'],
    [5, 3, 'two'],
    [1, 9, 'far'],
    [9, 1, 'far'],
  ])('diffKind(%i,%i)=%s', (i, j, e) => expect(diffKind(i, j)).toBe(e))

  test.each([
    ['exact', 'exact'],
    ['down', 'near'],
    ['up', 'near'],
    ['two', 'far'],
    ['far', 'miss'],
    ['none', 'miss'],
  ] as const)('diffHit(%s)=%s', (k, e) => expect(diffHit(k)).toBe(e))

  test('nearCount counts down, up and two only', () => {
    expect(nearCount([])).toBe(0)
    expect(
      nearCount([
        { diff: 'exact' },
        { diff: 'down' },
        { diff: 'up' },
        { diff: 'two' },
        { diff: 'far' },
        { diff: 'none' },
      ]),
    ).toBe(3)
  })

  test('breakdownRows covers only the predicted positions and ignores the fastest lap', () => {
    const results = [result(0, 99), result(1, 10), result(2, 20), result(3, 30), result(4, 40)]
    const rows = breakdownRows(results, { 1: pick(20), 2: pick(10) }, { rules })
    expect(rows.map((r) => [r.position, r.j, r.diff, r.points])).toEqual([
      [1, 2, 'down', pointsForPosition(rules, 2, 1)],
      [2, 1, 'up', pointsForPosition(rules, 1, 2)],
    ])
    expect(rows[0]!.mine?.driverId).toBe(20)
  })

  test('not predicted drivers have j=-1 and 0 points; API points override the rules', () => {
    const results = [result(1, 10), result(2, 20)]
    const rows = breakdownRows(
      results,
      { 1: pick(10), 2: pick(30) },
      {
        pointsByPosition: { '1': 7 },
        rules,
      },
    )
    expect(rows.map((r) => [r.j, r.diff, r.points])).toEqual([
      [1, 'exact', 7],
      [-1, 'none', 0],
    ])
  })

  test('no picks or no results give no rows; no rules and no API points leave points undefined', () => {
    expect(breakdownRows([], { 1: pick(1) })).toEqual([])
    expect(breakdownRows([result(1, 1)], {})).toEqual([])
    expect(breakdownRows([result(1, 1)], { 1: pick(1) })[0]!.points).toBeUndefined()
  })

  test('totalCell only adds the session in the scored moment', () => {
    expect(totalCell(100, 25, 'res')).toBe(125)
    expect(totalCell(100, 25, 'open')).toBe(100)
    expect(totalCell(100, 25, 'pre')).toBe(100)
    expect(totalCell(100, -5, 'res')).toBe(95)
  })
})

describe('gpBonus', () => {
  const up = (name: string | null, pts: number | null) =>
    ({
      user: name ? { id: 1, username: name } : undefined,
      pointsInGP: pts,
    }) as unknown as UserPoints

  test('nobody scored, negatives and empty', () => {
    expect(gpBonus([], 5, false)).toEqual({ names: [], points: 0, award: 5, confirmed: false })
    expect(gpBonus([up('a', 0), up('b', null)], undefined, true)).toMatchObject({
      names: [],
      points: 0,
      confirmed: true,
    })
    expect(gpBonus([up('a', -4)], 1, true).names).toEqual([])
  })

  test('ties share the bonus; nameless rows are dropped', () => {
    expect(gpBonus([up('a', 9), up('b', 9), up(null, 9), up('c', 1)], 3, true)).toEqual({
      names: ['a', 'b'],
      points: 9,
      award: 3,
      confirmed: true,
    })
  })
})
