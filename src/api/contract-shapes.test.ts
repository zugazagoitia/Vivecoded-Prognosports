import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, test, vi } from 'vitest'
import { fail, ok } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import { ApiError, genericMessage } from './errors'
import { onContractError, onSessionExpired } from './events'
import { request, requestParsed, setTokenProvider } from './client'
import { messageFor } from './messages'
import { isCommunityKey, keys } from '@/queries/keys'
import {
  AuthTokenSchema,
  CircuitSchema,
  CommunityDetailSchema,
  CommunitySchema,
  DriverSchema,
  GrandPrixSchema,
  RaceSessionSchema,
  RuleSetSchema,
  StartGridPositionSchema,
  UserPointsSchema,
  UserRankSchema,
  UserSchema,
  sanitizeUser,
} from './schemas'

afterEach(() => setTokenProvider(() => null))

describe('error mapping in the client', () => {
  it('business error: HTTP 200 + success:false keeps its code (606) and message', async () => {
    server.use(
      http.get('*/v2/biz', () =>
        HttpResponse.json({ success: false, code: 606, message: 'Credenciales inválidas' }),
      ),
    )
    await expect(request('/v2/biz')).rejects.toMatchObject({
      status: 200,
      code: 606,
      message: 'Credenciales inválidas',
      kind: 'http',
    })
  })
  it('success:false with an explicit status wins over the HTTP status', async () => {
    server.use(
      http.get('*/v2/biz', () => HttpResponse.json({ success: false, status: 422, message: 'x' })),
    )
    await expect(request('/v2/biz')).rejects.toMatchObject({ status: 422 })
  })
  test.each([
    [400, 'La solicitud no es válida.'],
    [401, 'Tu sesión ha caducado.'],
    [403, 'No tienes permiso para realizar esta acción.'],
    [404, 'No se ha encontrado el recurso solicitado.'],
    [409, 'La operación entra en conflicto con el estado actual.'],
    [500, 'Error interno del servidor.'],
    [502, 'Error interno del servidor.'],
    [418, 'Se ha producido un error inesperado.'],
  ])('HTTP %i with an empty body -> generic message', async (status, msg) => {
    server.use(http.get('*/v2/e', () => new HttpResponse(null, { status })))
    await expect(request('/v2/e')).rejects.toMatchObject({ status, message: msg })
    expect(genericMessage(status)).toBe(msg)
  })
  it('500 with a plain-text body uses the text as message', async () => {
    server.use(
      http.get('*/v2/e', () => new HttpResponse('Endpoint GET x not found', { status: 404 })),
    )
    await expect(request('/v2/e')).rejects.toMatchObject({
      status: 404,
      message: 'Endpoint GET x not found',
    })
  })
  it('500 with malformed JSON does not crash the parser', async () => {
    server.use(
      http.get(
        '*/v2/e',
        () =>
          new HttpResponse('{"success": tru', {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    await expect(request('/v2/e')).rejects.toMatchObject({ status: 500, kind: 'http' })
  })
  it('a 200 with malformed JSON is returned as text (not an envelope)', async () => {
    server.use(http.get('*/v2/e', () => new HttpResponse('{oops', { status: 200 })))
    await expect(request('/v2/e')).resolves.toBe('{oops')
  })
  it('HTTP 401 mid-session emits session-expired once and still rejects', async () => {
    const h = vi.fn()
    const off = onSessionExpired(h)
    setTokenProvider(() => 'tok')
    server.use(http.get('*/v2/me', () => new HttpResponse(null, { status: 401 })))
    await expect(request('/v2/me')).rejects.toMatchObject({ status: 401 })
    expect(h).toHaveBeenCalledTimes(1)
    off()
  })
  it('401 does not expire the session when noSessionExpiry is set', async () => {
    const h = vi.fn()
    const off = onSessionExpired(h)
    server.use(http.get('*/v2/me', () => new HttpResponse(null, { status: 401 })))
    await expect(request('/v2/me', { noSessionExpiry: true })).rejects.toBeInstanceOf(ApiError)
    expect(h).not.toHaveBeenCalled()
    off()
  })
  it('403 never expires the session', async () => {
    const h = vi.fn()
    const off = onSessionExpired(h)
    server.use(http.get('*/v2/x', () => fail(403, 'prohibido')))
    await expect(request('/v2/x')).rejects.toMatchObject({ status: 403 })
    expect(h).not.toHaveBeenCalled()
    off()
  })
  it('the token is read at request time (login/logout without recreating the client)', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('*/v2/t', ({ request: r }) => {
        seen.push(r.headers.get('Authorization'))
        return ok(null)
      }),
    )
    let t: string | null = null
    setTokenProvider(() => t)
    await request('/v2/t')
    t = 'a'
    await request('/v2/t')
    t = null
    await request('/v2/t')
    expect(seen).toEqual([null, 'Bearer a', null])
  })
  it('an aborted request is not reported as a timeout or network error', async () => {
    server.use(http.get('*/v2/slow', () => new Promise<never>(() => {})))
    const ctrl = new AbortController()
    const p = request('/v2/slow', { signal: ctrl.signal, timeoutMs: 5000 })
    ctrl.abort()
    const e = await p.catch((x: unknown) => x)
    expect(e).not.toBeInstanceOf(ApiError)
  })
  it('requestParsed rejects with kind contract (status 200) and emits the issues', async () => {
    const h = vi.fn()
    const off = onContractError(h)
    server.use(http.get('*/v2/g', () => ok({ id: 'not-a-number' })))
    await expect(requestParsed('/v2/g', DriverSchema)).rejects.toMatchObject({
      kind: 'contract',
      status: 200,
      isContractError: true,
    })
    expect(h).toHaveBeenCalledWith(expect.objectContaining({ path: '/v2/g' }))
    off()
  })
  it('requestParsed propagates HTTP errors untouched (no contract event)', async () => {
    const h = vi.fn()
    const off = onContractError(h)
    server.use(http.get('*/v2/g', () => fail(404, 'no')))
    await expect(requestParsed('/v2/g', DriverSchema)).rejects.toMatchObject({ status: 404 })
    expect(h).not.toHaveBeenCalled()
    off()
  })
})

describe('messageFor extra cases', () => {
  it('contract and timeout errors', () => {
    expect(messageFor(new ApiError(0, undefined, 'x', 'timeout'))).toEqual(expect.any(String))
    expect(messageFor(new ApiError(200, undefined, 'x', 'contract'))).toEqual(expect.any(String))
    expect(messageFor(new ApiError(413, undefined, 'La imagen supera', 'validation'))).toContain(
      'imagen',
    )
  })
})

describe('User schema', () => {
  const base = { id: 1, username: 'ana' }
  it('requires id and username', () => {
    expect(UserSchema.safeParse({ username: 'a' }).success).toBe(false)
    expect(UserSchema.safeParse({ id: 1 }).success).toBe(false)
    expect(UserSchema.safeParse({ id: '1', username: 'a' }).success).toBe(false)
  })
  it('accepts null for every optional field', () => {
    const r = UserSchema.parse({
      ...base,
      email: null,
      bio: null,
      rank: null,
      preferences: null,
      verified: null,
    })
    expect(r.rank).toBeNull()
    expect(r.timeZone).toBeUndefined()
    expect(r.verified).toBeUndefined()
  })
  it('spec `verified` wins over real `verified_at`', () => {
    expect(UserSchema.parse({ ...base, verified: 'A', verified_at: 'B' }).verified).toBe('A')
    expect(UserSchema.parse({ ...base, verified_at: 'B' }).verified).toBe('B')
    expect(UserSchema.parse(base).verified).toBeUndefined()
  })
  it('snake_case fields are normalised and not leaked', () => {
    const r = UserSchema.parse({
      ...base,
      last_activity: 'L',
      has_profile_image: true,
      current_community: { id: 3 },
      time_zone: 'UTC',
    })
    expect(r).toMatchObject({
      lastActivity: 'L',
      hasProfileImage: true,
      currentCommunity: { id: 3 },
      timeZone: 'UTC',
    })
    for (const k of [
      'last_activity',
      'has_profile_image',
      'current_community',
      'time_zone',
      'verified_at',
    ])
      expect(r).not.toHaveProperty(k)
  })
  it('camelCase wins over snake_case', () => {
    expect(UserSchema.parse({ ...base, lastActivity: 'c', last_activity: 's' }).lastActivity).toBe(
      'c',
    )
    expect(UserSchema.parse({ ...base, timeZone: 'c', time_zone: 's' }).timeZone).toBe('c')
  })
  it('time zone falls back to preferences[time-zone-id] only when it is a string', () => {
    expect(
      UserSchema.parse({ ...base, preferences: { 'time-zone-id': 'Europe/Madrid' } }).timeZone,
    ).toBe('Europe/Madrid')
    expect(
      UserSchema.parse({ ...base, preferences: { 'time-zone-id': 5 } }).timeZone,
    ).toBeUndefined()
  })
  it('drops hashedPassword and unknown keys', () => {
    const r = UserSchema.parse({ ...base, hashedPassword: 'x', extra: 1 })
    expect(r).not.toHaveProperty('hashedPassword')
    expect(r).not.toHaveProperty('extra')
  })
  it('rank.admin defaults to false', () => {
    expect(UserRankSchema.parse({ name: 'Miembro' }).admin).toBe(false)
    expect(UserSchema.parse({ ...base, rank: { name: 'admin' } }).rank?.admin).toBe(false)
  })
  it('a wrong type reports the offending path', () => {
    const r = UserSchema.safeParse({ ...base, preferences: 'x' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['preferences'])
  })
  it('sanitizeUser strips hashedPassword without mutating', () => {
    const raw = { id: 1, hashedPassword: 'x' }
    expect(sanitizeUser(raw)).toEqual({ id: 1 })
    expect(raw.hashedPassword).toBe('x')
  })
})

describe('Community schemas', () => {
  const base = { name: 'C', open: true }
  it('requires id in the list form, but not in the detail form', () => {
    const c = { ...base, members_amount: 2, user_is_member: true }
    expect(CommunitySchema.safeParse(c).success).toBe(false)
    expect(CommunityDetailSchema.parse(c).id).toBeUndefined()
    expect(CommunityDetailSchema.parse({ ...c, id: 4 }).id).toBe(4)
  })
  it('fails with a clear path when membership is missing', () => {
    const r = CommunitySchema.safeParse({ ...base, id: 1 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]).toMatchObject({ path: ['userIsMember'] })
    expect(r.error?.issues[0]?.message).toMatch(/user_is_member/)
  })
  it('userIsMember=false is kept (not treated as missing)', () => {
    expect(CommunitySchema.parse({ ...base, id: 1, user_is_member: false }).userIsMember).toBe(
      false,
    )
    expect(CommunitySchema.parse({ ...base, id: 1, userIsMember: false }).userIsMember).toBe(false)
  })
  it('camelCase wins; members_amount is not leaked', () => {
    const r = CommunitySchema.parse({
      ...base,
      id: 1,
      user_is_member: false,
      userIsMember: true,
      membersAmount: 9,
      members_amount: 1,
    })
    expect(r).toMatchObject({ userIsMember: true, membersAmount: 9 })
    expect(r).not.toHaveProperty('members_amount')
    expect(r).not.toHaveProperty('user_is_member')
  })
  it('open must be a boolean', () => {
    expect(
      CommunitySchema.safeParse({ name: 'C', id: 1, open: 'yes', user_is_member: true }).success,
    ).toBe(false)
  })
  it('nested default rule set is normalised too (isPublic -> public)', () => {
    const r = CommunityDetailSchema.parse({
      ...base,
      user_is_member: true,
      defaultRuleSet: { id: 1, isPublic: false },
    })
    expect(r.defaultRuleSet).toMatchObject({ public: false })
  })
})

describe('RuleSet schema', () => {
  it('public wins over isPublic; both false-y values are kept', () => {
    expect(RuleSetSchema.parse({ id: 1, public: true, isPublic: false }).public).toBe(true)
    expect(RuleSetSchema.parse({ id: 1, isPublic: false }).public).toBe(false)
  })
  it('fails when neither flag is present', () => {
    const r = RuleSetSchema.safeParse({ id: 1 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/isPublic/)
  })
  it('pointsByEqualsPosition is a nested map session -> position -> points', () => {
    const r = RuleSetSchema.parse({
      id: 1,
      isPublic: true,
      data: { pointsByEqualsPosition: { '1': { '1': 25, '2': 18 }, '2': { '1': 25 } } },
    })
    expect(r.data?.pointsByEqualsPosition).toEqual({ '1': { '1': 25, '2': 18 }, '2': { '1': 25 } })
  })
})

describe('UserPoints schema', () => {
  it('maps the backend typo stadings* to standings*', () => {
    const r = UserPointsSchema.parse({ stadingsByHits: 3, previousStadingsByHits: 4 })
    expect(r).toMatchObject({ standingsByHits: 3, previousStandingsByHits: 4 })
    expect(r).not.toHaveProperty('stadingsByHits')
  })
  it('correct spelling wins over the typo', () => {
    expect(UserPointsSchema.parse({ stadingsByHits: 3, standingsByHits: 1 }).standingsByHits).toBe(
      1,
    )
  })
  it('pointsBySession is keyed by session key (real shape)', () => {
    const r = UserPointsSchema.parse({
      pointsBySession: { '1': 10, '2': 25, '4': 8 },
      pointsInGP: 43,
    })
    expect(r.pointsBySession).toEqual({ '1': 10, '2': 25, '4': 8 })
  })
  it('rejects non-numeric points', () => {
    expect(UserPointsSchema.safeParse({ pointsInGP: '43' }).success).toBe(false)
  })
  it('empty object is valid (everything optional)', () => {
    expect(UserPointsSchema.safeParse({}).success).toBe(true)
  })
})

describe('catalog schemas', () => {
  it('GrandPrix requires id and name; code may be null', () => {
    expect(GrandPrixSchema.safeParse({ id: 1 }).success).toBe(false)
    expect(GrandPrixSchema.parse({ id: 1, name: 'x', code: null }).code).toBeNull()
  })
  it('sessions of a GP carry shared ids 1-4 and no key', () => {
    const r = GrandPrixSchema.parse({
      id: 1,
      name: 'Singapore Grand Prix',
      sessions: [
        { id: 1, code: 'Q', name: 'QUALIFY' },
        { id: 2, code: 'R', name: 'RACE', hasGrid: true },
        { id: 4, code: 'SR', name: 'SPRINT_RACE', hasGrid: true },
      ],
    })
    expect(r.sessions?.map((s) => s.id)).toEqual([1, 2, 4])
    expect(r.sessions?.every((s) => s.key === undefined)).toBe(true)
  })
  it('previous/next GP only need an id', () => {
    const r = GrandPrixSchema.parse({
      id: 2,
      name: 'x',
      previousGrandPrix: { id: 1 },
      nextGrandPrix: { id: 3 },
    })
    expect(r.previousGrandPrix).toEqual({ id: 1 })
  })
  it('variants of a circuit', () => {
    const r = CircuitSchema.parse({
      id: 1,
      latitude: 1.2,
      longitude: 3.4,
      variants: [{ id: 5, distance: 5.4, turns: 19, hasLayoutImage: true }],
    })
    expect(r.variants?.[0]?.hasLayoutImage).toBe(true)
    expect(CircuitSchema.safeParse({ id: 1, variants: [{ distance: 1 }] }).success).toBe(false)
  })
  it('Driver rejects a string id and keeps nested team', () => {
    expect(DriverSchema.safeParse({ id: '1' }).success).toBe(false)
    expect(DriverSchema.parse({ id: 1, team: { id: 2, name: 'T' } }).team?.name).toBe('T')
  })
  it('RaceSession and StartGridPosition', () => {
    expect(RaceSessionSchema.safeParse({ code: 'R' }).success).toBe(false)
    expect(StartGridPositionSchema.safeParse({ driver: { id: 1 } }).success).toBe(false)
    expect(
      StartGridPositionSchema.parse({ driver: { id: 1 }, position: 3, note: null }).position,
    ).toBe(3)
  })
  it('AuthToken requires token, lifetime and current', () => {
    expect(AuthTokenSchema.safeParse({ token: 't' }).success).toBe(false)
    expect(AuthTokenSchema.parse({ token: 't', lifetime: 10, current: true }).current).toBe(true)
  })
})

describe('query keys', () => {
  it('community-scoped keys carry the community id at index 1', () => {
    const cases = [
      keys.community(5),
      keys.points(5, 1, 9),
      keys.tipps(5, 1, 9, 3, 2),
      keys.userResume(5, 7, 1, 9),
      keys.members(5),
      keys.ruleset(5, 1, 9),
      keys.ruleset(5, 1, 9, 3),
    ]
    for (const k of cases) {
      expect(isCommunityKey(k, 5)).toBe(true)
      expect(isCommunityKey(k, 6)).toBe(false)
    }
  })
  it('compares ids as strings', () => {
    expect(isCommunityKey(['community', '5'], 5)).toBe(true)
    expect(isCommunityKey(['community', 5], '5')).toBe(true)
  })
  it('non community keys never match', () => {
    for (const k of [
      keys.me(),
      keys.user(5),
      keys.gps(1, 9),
      keys.invitation('X'),
      keys.results(1, 9, 3, 2),
    ])
      expect(isCommunityKey(k, 5)).toBe(false)
    expect(isCommunityKey([], 5)).toBe(false)
  })
  it('keys are stable and distinct per argument', () => {
    expect(keys.gps('f1', 9)).toEqual(['gps', 'f1', 9])
    expect(keys.gps('f1', 9)).not.toEqual(keys.gps('f1', 8))
    expect(keys.grid(1, 9, 3, 2)).toEqual(['grid', 1, 9, 3, 2])
    expect(keys.userCommunities(7)).toEqual(['user-communities', 7])
  })
})
