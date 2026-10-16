import { http } from 'msw'
import { afterEach, describe, expect, test } from 'vitest'
import { ok } from '@/mocks/envelope'
import { server } from '@/mocks/server'
import * as admin from './admin'
import * as auth from './auth'
import * as catalog from './catalog'
import * as communities from './communities'
import * as competitions from './competitions'
import * as gps from './gps'
import * as notifications from './notifications'
import * as user from './user'
import { setBaseUrl, setTokenProvider } from './client'

interface Seen {
  method: string
  path: string
  search: string
  body: unknown
  auth: string | null
  contentType: string | null
}

/** Captures the first request and answers `result` (wrappers with Zod schemas may then reject: ignored). */
async function capture(call: () => Promise<unknown>, result: unknown = null): Promise<Seen> {
  let seen: Seen | undefined
  server.use(
    http.all('*/v2/*', async ({ request }) => {
      const u = new URL(request.url)
      const type = request.headers.get('content-type')
      const text = type?.includes('json') ? await request.clone().text() : ''
      seen ??= {
        method: request.method,
        path: u.pathname,
        search: u.search,
        body: text && type?.includes('json') ? JSON.parse(text) : undefined,
        auth: request.headers.get('Authorization'),
        contentType: type,
      }
      return ok(result)
    }),
  )
  await call().catch(() => undefined)
  if (!seen) throw new Error('no request was made')
  return seen
}

afterEach(() => {
  setTokenProvider(() => null)
  setBaseUrl('http://api.test')
})

type Row = [string, () => Promise<unknown>, string, string, unknown?]

const rows: Row[] = [
  // auth
  [
    'login',
    () => auth.login({ username: 'a', password: 'b' }),
    'POST',
    '/v2/auth/login',
    { username: 'a', password: 'b' },
  ],
  ['logout', () => auth.logout(), 'DELETE', '/v2/auth/logout'],
  [
    'register',
    () => auth.register({ username: 'a', email: 'e', password: 'p' }),
    'POST',
    '/v2/auth/register',
    { username: 'a', email: 'e', password: 'p' },
  ],
  [
    'forgotPassword',
    () => auth.forgotPassword('a@b.c'),
    'POST',
    '/v2/auth/forgotpassword',
    { email: 'a@b.c' },
  ],
  [
    'changePassword',
    () => auth.changePassword({ password: 'x' }),
    'PATCH',
    '/v2/auth/changepassword',
    { password: 'x' },
  ],
  [
    'resetPassword maps code -> token',
    () => auth.resetPassword({ email: 'e', code: 'ABC123', password: 'p' }),
    'PATCH',
    '/v2/auth/changepassword',
    { email: 'e', token: 'ABC123', password: 'p' },
  ],
  ['sendVerifyEmail', () => auth.sendVerifyEmail(), 'POST', '/v2/auth/send-verify-email'],
  [
    'verifyEmail',
    () => auth.verifyEmail('ABC123'),
    'POST',
    '/v2/auth/verify-email',
    { token: 'ABC123' },
  ],
  ['listTokens', () => auth.listTokens(), 'GET', '/v2/auth/tokens'],
  [
    'revokeToken encodes the token',
    () => auth.revokeToken('a/b'),
    'DELETE',
    '/v2/auth/tokens/a%2Fb',
  ],
  ['revokeAllTokens', () => auth.revokeAllTokens(), 'DELETE', '/v2/auth/tokens'],
  // user
  ['getMe', () => user.getMe(), 'GET', '/v2/user/me'],
  ['listUsers', () => user.listUsers(), 'GET', '/v2/user'],
  ['getUser', () => user.getUser(7), 'GET', '/v2/user/7'],
  [
    'updateUser PATCH with password and time zone',
    () => user.updateUser(7, { password: 'n', preferences: { 'time-zone-id': 'Europe/Madrid' } }),
    'PATCH',
    '/v2/user/7',
    { password: 'n', preferences: { 'time-zone-id': 'Europe/Madrid' } },
  ],
  [
    'updateUser birthdate as sent',
    () => user.updateUser(7, { birthdate: '31/12/1990' }),
    'PATCH',
    '/v2/user/7',
    { birthdate: '31/12/1990' },
  ],
  ['deleteUserImage', () => user.deleteUserImage(7), 'DELETE', '/v2/user/7/image'],
  [
    'updateEmail',
    () => user.updateEmail(7, 'n@e.c', 'pw'),
    'PATCH',
    '/v2/user/7/settings/email',
    { email: 'n@e.c', password: 'pw' },
  ],
  [
    'updatePassword',
    () => user.updatePassword(7, { old: 'a', password: 'b' }),
    'PATCH',
    '/v2/user/7/settings/password',
    { old: 'a', password: 'b' },
  ],
  [
    'linkTelegram',
    () => user.linkTelegram(7, { code: '1' }),
    'POST',
    '/v2/user/7/settings/telegram',
    { code: '1' },
  ],
  ['unlinkTelegram', () => user.unlinkTelegram(7), 'DELETE', '/v2/user/7/settings/telegram'],
  ['listUserCommunities', () => user.listUserCommunities(7), 'GET', '/v2/user/7/communities'],
  [
    'getUserResume',
    () => user.getUserResume(7, 1, 'f1', 9),
    'GET',
    '/v2/user/7/communities/1/f1/9/resume',
  ],
  [
    'getUserCumulatedPoints',
    () => user.getUserCumulatedPoints(7, 1, 1, 9),
    'GET',
    '/v2/user/7/communities/1/1/9/cummulatedpoints',
  ],
  [
    'getUserPoints',
    () => user.getUserPoints(7, 1, 1, 9),
    'GET',
    '/v2/user/7/communities/1/1/9/points',
  ],
  [
    'getUserPointsInGp',
    () => user.getUserPointsInGp(7, 1, 1, 9, 3),
    'GET',
    '/v2/user/7/communities/1/1/9/points/3',
  ],
  // competitions / seasons
  ['listCompetitions', () => competitions.listCompetitions(), 'GET', '/v2/competitions/'],
  ['getCompetition', () => competitions.getCompetition('f1'), 'GET', '/v2/competitions/f1'],
  [
    'createCompetition',
    () => competitions.createCompetition({ name: 'x' }),
    'POST',
    '/v2/competitions',
    { name: 'x' },
  ],
  [
    'updateCompetition',
    () => competitions.updateCompetition(1, { name: 'x' }),
    'PUT',
    '/v2/competitions/1',
    { name: 'x' },
  ],
  ['deleteCompetition', () => competitions.deleteCompetition(1), 'DELETE', '/v2/competitions/1'],
  [
    'listCompetitionSeasons',
    () => competitions.listCompetitionSeasons(1),
    'GET',
    '/v2/competitions/1/seasons',
  ],
  ['listSeasons', () => competitions.listSeasons(), 'GET', '/v2/seasons/'],
  ['getCurrentSeason', () => competitions.getCurrentSeason('f1'), 'GET', '/v2/seasons/current/f1'],
  ['getSeason', () => competitions.getSeason(9), 'GET', '/v2/seasons/9/'],
  [
    'createSeason',
    () => competitions.createSeason({ year: 2027 }),
    'POST',
    '/v2/seasons',
    { year: 2027 },
  ],
  [
    'updateSeason',
    () => competitions.updateSeason(9, { year: 2027 }),
    'PUT',
    '/v2/seasons/9',
    { year: 2027 },
  ],
  ['deleteSeason', () => competitions.deleteSeason(9), 'DELETE', '/v2/seasons/9'],
  [
    'addGpToSeason',
    () => competitions.addGpToSeason(9, { gp: 1 }),
    'POST',
    '/v2/seasons/9/gps',
    { gp: 1 },
  ],
  // communities
  ['listCommunities', () => communities.listCommunities(), 'GET', '/v2/communities'],
  ['getCommunity', () => communities.getCommunity(5), 'GET', '/v2/communities/5'],
  [
    'createCommunity',
    () => communities.createCommunity({ name: 'c' }),
    'POST',
    '/v2/communities',
    { name: 'c' },
  ],
  ['listMembers', () => communities.listMembers(5), 'GET', '/v2/communities/5/members'],
  [
    'joinCommunity (real route has /join/)',
    () => communities.joinCommunity(5, 'ABC'),
    'POST',
    '/v2/communities/5/join/ABC',
  ],
  ['quitCommunity', () => communities.quitCommunity(5), 'POST', '/v2/communities/5/quit'],
  [
    'recreateInvitation uses recreate, not the spec typo',
    () => communities.recreateInvitation(5),
    'POST',
    '/v2/communities/5/recreate',
  ],
  [
    'deleteCommunityImage',
    () => communities.deleteCommunityImage(5),
    'DELETE',
    '/v2/communities/5/image',
  ],
  [
    'getCommunityPoints',
    () => communities.getCommunityPoints(5, 1, 9),
    'GET',
    '/v2/communities/5/1/9/points',
  ],
  [
    'getCommunityPointsInGp',
    () => communities.getCommunityPointsInGp(5, 1, 9, 3),
    'GET',
    '/v2/communities/5/1/9/points/3',
  ],
  [
    'getTotalUserPoints',
    () => communities.getTotalUserPoints(5, 1, 9),
    'GET',
    '/v2/communities/5/1/9/totaluserpoints',
  ],
  // gps
  ['listAllGps', () => gps.listAllGps(), 'GET', '/v2/gps'],
  ['listGps', () => gps.listGps('f1', 9), 'GET', '/v2/gps/f1/9'],
  ['getNextGp', () => gps.getNextGp('f1'), 'GET', '/v2/gps/f1/next'],
  ['getGp', () => gps.getGp(3), 'GET', '/v2/gps/3'],
  [
    'createGp',
    () => gps.createGp({ name: 'n', code: 'c' }),
    'POST',
    '/v2/gps/',
    { name: 'n', code: 'c' },
  ],
  ['updateGp', () => gps.updateGp(3, { name: 'n' }), 'PUT', '/v2/gps/3', { name: 'n' }],
  ['deleteGpImage', () => gps.deleteGpImage(1, 9, 3), 'DELETE', '/v2/gps/1/9/3/image'],
  ['listGpDrivers', () => gps.listGpDrivers(1, 9, 3), 'GET', '/v2/gps/1/9/3/drivers'],
  [
    'addGpDriver',
    () => gps.addGpDriver(1, 9, 3, { id: 4 }),
    'POST',
    '/v2/gps/1/9/3/drivers',
    { id: 4 },
  ],
  ['removeGpDriver', () => gps.removeGpDriver(1, 9, 3, 4), 'DELETE', '/v2/gps/1/9/3/drivers/4'],
  ['listGpSessions', () => gps.listGpSessions(1, 9, 3), 'GET', '/v2/gps/1/9/3/sessions'],
  ['getGpSession', () => gps.getGpSession(1, 9, 3, 2), 'GET', '/v2/gps/1/9/3/sessions/2'],
  [
    'createGpSession',
    () => gps.createGpSession(1, 9, 3, { session: 2 }),
    'POST',
    '/v2/gps/1/9/3/sessions',
    { session: 2 },
  ],
  [
    'updateGpSession includes the session id',
    () => gps.updateGpSession(1, 9, 3, 2, { date: 'd' }),
    'PUT',
    '/v2/gps/1/9/3/sessions/2',
    { date: 'd' },
  ],
  ['deleteGpSession', () => gps.deleteGpSession(1, 9, 3, 2), 'DELETE', '/v2/gps/1/9/3/sessions/2'],
  ['getTipps', () => gps.getTipps(1, 9, 3, 2, 5), 'GET', '/v2/gps/1/9/3/sessions/2/tipps/5'],
  [
    'submitTipps wraps the list under tipps',
    () => gps.submitTipps(1, 9, 3, 2, 5, [{ position: 1, driver: { id: 4 } }]),
    'POST',
    '/v2/gps/1/9/3/sessions/2/tipps/5',
    { tipps: [{ position: 1, driver: { id: 4 } }] },
  ],
  [
    'getCalculations',
    () => gps.getCalculations(1, 9, 3, 2, 5, 7),
    'GET',
    '/v2/gps/1/9/3/sessions/2/tipps/5/calculations',
  ],
  [
    'simulateCalculations sends bare driver ids',
    () => gps.simulateCalculations(1, 9, 3, 2, 5, 7, [{ position: 1, driver: 4 }]),
    'POST',
    '/v2/gps/1/9/3/sessions/2/tipps/5/calculations',
    { results: [{ position: 1, driver: 4 }] },
  ],
  ['getResults', () => gps.getResults(1, 9, 3, 2), 'GET', '/v2/gps/1/9/3/sessions/2/results'],
  [
    'submitResults',
    () => gps.submitResults(1, 9, 3, 2, [{ position: 1, driver: { id: 4 } }]),
    'POST',
    '/v2/gps/1/9/3/sessions/2/results',
    [{ position: 1, driver: { id: 4 } }],
  ],
  [
    'getGrid uses /sessions/{s}/grid',
    () => gps.getGrid(1, 9, 3, 2),
    'GET',
    '/v2/gps/1/9/3/sessions/2/grid',
  ],
  ['updateGrid', () => gps.updateGrid(1, 9, 3, { a: 1 }), 'PATCH', '/v2/gps/1/9/3/grid', { a: 1 }],
  [
    'notifyGridChanges',
    () => gps.notifyGridChanges(1, 9, 3),
    'POST',
    '/v2/gps/1/9/3/grid/notification',
  ],
  ['getGridDriver', () => gps.getGridDriver(1, 9, 3, 4), 'GET', '/v2/gps/1/9/3/grid/4'],
  [
    'updateGridDriverNote',
    () => gps.updateGridDriverNote(1, 9, 3, 4, { note: null }),
    'PATCH',
    '/v2/gps/1/9/3/grid/4',
    { note: null },
  ],
  // notifications
  [
    'listNotificationChannels',
    () => notifications.listNotificationChannels(),
    'GET',
    '/v2/notifications/channels',
  ],
  [
    'listNotificationTypes',
    () => notifications.listNotificationTypes(),
    'GET',
    '/v2/notifications/types',
  ],
  [
    'setNotificationPreference',
    () =>
      notifications.setNotificationPreference({
        notification: 'n',
        channel: 'mail',
        toggleTo: true,
      }),
    'PATCH',
    '/v2/notifications/preferences',
    { notification: 'n', channel: 'mail', toggleTo: true },
  ],
  ['listTimezones', () => notifications.listTimezones(), 'GET', '/v2/timezones'],
  // catalog
  ['listCircuits', () => catalog.listCircuits(), 'GET', '/v2/circuits/'],
  ['getCircuit', () => catalog.getCircuit(3), 'GET', '/v2/circuits/3'],
  [
    'createCircuit',
    () => catalog.createCircuit({ name: 'c' }),
    'POST',
    '/v2/circuits/',
    { name: 'c' },
  ],
  [
    'updateCircuit',
    () => catalog.updateCircuit(3, { name: 'c' }),
    'PUT',
    '/v2/circuits/3',
    { name: 'c' },
  ],
  ['deleteCircuit', () => catalog.deleteCircuit(3), 'DELETE', '/v2/circuits/3'],
  ['listCircuitGps', () => catalog.listCircuitGps(3), 'GET', '/v2/circuits/3/gps'],
  ['getCircuitVariant', () => catalog.getCircuitVariant(3, 2), 'GET', '/v2/circuits/3/2'],
  ['listVariantGps', () => catalog.listVariantGps(3, 2), 'GET', '/v2/circuits/3/2/gps'],
  ['listDrivers', () => catalog.listDrivers(), 'GET', '/v2/drivers'],
  ['getDriver', () => catalog.getDriver(4), 'GET', '/v2/drivers/4'],
  ['listConstructors', () => catalog.listConstructors(), 'GET', '/v2/constructors/'],
  ['listSessions', () => catalog.listSessions(), 'GET', '/v2/sessions'],
  ['listRulesets', () => catalog.listRulesets(), 'GET', '/v2/rulesets/'],
  // admin
  [
    'notifyGrid is POST',
    () => admin.notifyGrid(1, 9, 3, 4),
    'POST',
    '/v2/gps/1/9/3/sessions/4/grid/notification',
  ],
  [
    'publishGrid sends bare driver ids',
    () =>
      admin.publishGrid(1, 9, 3, 4, [{ position: 1, driver: 44, isFromPit: false, note: null }]),
    'PATCH',
    '/v2/gps/1/9/3/sessions/4/grid',
    { grid: [{ position: 1, driver: 44, isFromPit: false, note: null }] },
  ],
  [
    'replaceGpDrivers is PUT grouped by constructor',
    () => admin.replaceGpDrivers(1, 9, 3, { 6: [{ id: 1 }, { id: 2 }], 7: [{ id: 3 }] }),
    'PUT',
    '/v2/gps/1/9/3/drivers',
    { 6: [{ id: 1 }, { id: 2 }], 7: [{ id: 3 }] },
  ],
  [
    'saveSessionResults with fast lap as string',
    () => admin.saveSessionResults(1, 9, 3, 2, { '1': 44 }, 63),
    'POST',
    '/v2/gps/1/9/3/sessions/2/results',
    { results: { '1': 44 }, fastLap: '63' },
  ],
  [
    'saveSessionResults without fast lap',
    () => admin.saveSessionResults(1, 9, 3, 2, { '1': 44 }, null),
    'POST',
    '/v2/gps/1/9/3/sessions/2/results',
    { results: { '1': 44 } },
  ],
  [
    'recalculateSession',
    () => admin.recalculateSession(1, 9, 3, 2),
    'POST',
    '/v2/gps/1/9/3/sessions/2/calculations',
  ],
  [
    'sendManualNotification',
    () => admin.sendManualNotification({ type: 't', title: 'T', message: 'm', channels: ['mail'] }),
    'POST',
    '/v2/notifications',
    { type: 't', title: 'T', message: 'm', channels: ['mail'] },
  ],
  ['listTimezoneNames', () => admin.listTimezoneNames(), 'GET', '/v2/timezones'],
  ['listChannelOptions', () => admin.listChannelOptions(), 'GET', '/v2/notifications/channels'],
]

describe('endpoint wrappers: method, URL and payload', () => {
  test.each(rows)('%s', async (_n, call, method, path, body) => {
    const seen = await capture(call)
    expect(seen.method).toBe(method)
    expect(seen.path).toBe(path)
    if (body !== undefined) expect(seen.body).toEqual(body)
    else expect(seen.body).toBeUndefined()
  })

  test.each([
    ['login', () => auth.login({ username: 'a', password: 'b' })],
    ['register', () => auth.register({ username: 'a', email: 'e', password: 'p' })],
    ['forgotPassword', () => auth.forgotPassword('e')],
    ['resetPassword', () => auth.resetPassword({ email: 'e', code: 'c', password: 'p' })],
    ['listTimezones', () => notifications.listTimezones()],
    ['listTimezoneNames', () => admin.listTimezoneNames()],
  ])('%s is anonymous (never sends the token)', async (_n, call) => {
    setTokenProvider(() => 'secret')
    expect((await capture(call)).auth).toBeNull()
  })

  test.each([
    ['getMe', () => user.getMe()],
    ['logout', () => auth.logout()],
    ['updateUser', () => user.updateUser(7, {})],
    ['joinCommunity', () => communities.joinCommunity(5, 'x')],
  ])('%s sends the bearer token', async (_n, call) => {
    setTokenProvider(() => 'secret')
    expect((await capture(call)).auth).toBe('Bearer secret')
  })
})

describe('query strings and URL helpers', () => {
  test('listCommunities sends competition and open', async () => {
    const seen = await capture(() => communities.listCommunities({ competition: 1, open: true }))
    expect(seen.search).toBe('?competition=1&open=true')
  })
  test('path segments are encoded', async () => {
    const seen = await capture(() => gps.getGp('a b/c'))
    expect(seen.path).toBe('/v2/gps/a%20b%2Fc')
  })
  test('public image URLs', () => {
    expect(gps.gpImageUrl(1, 9, 3)).toBe('http://api.test/v2/gps/1/9/3/image')
    expect(communities.communityImageUrl(5)).toBe('http://api.test/v2/communities/5/image')
    expect(catalog.circuitLayoutUrl(3, 2)).toBe('http://api.test/v2/circuits/3/2/layout')
    expect(user.userImagePath(7)).toBe('/v2/user/7/image')
  })
  test('image URLs honour a base URL with trailing slashes', () => {
    setBaseUrl('http://x.test///')
    expect(communities.communityImageUrl(5)).toBe('http://x.test/v2/communities/5/image')
  })
})

describe('uploads', () => {
  test.each([
    ['user', () => user.uploadUserImage(7, new Blob(['x'])), '/v2/user/7/image'],
    [
      'community',
      () => communities.uploadCommunityImage(5, new Blob(['x'])),
      '/v2/communities/5/image',
    ],
    ['gp', () => gps.uploadGpImage(1, 9, 3, new Blob(['x'])), '/v2/gps/1/9/3/image'],
    ['circuit logo', () => catalog.uploadCircuitLogo(3, new Blob(['x'])), '/v2/circuits/3/logo'],
    [
      'circuit layout',
      () => catalog.uploadCircuitLayout(3, 2, new Blob(['x'])),
      '/v2/circuits/3/2/layout',
    ],
  ])('%s image is a multipart POST', async (_n, call, path) => {
    const seen = await capture(call)
    expect(seen.method).toBe('POST')
    expect(seen.path).toBe(path)
    expect(seen.contentType).toMatch(/multipart\/form-data/)
  })
  test('oversized files are rejected before any request', () => {
    let called = false
    server.use(
      http.all('*/v2/*', () => {
        called = true
        return ok(null)
      }),
    )
    const big = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)])
    expect(() => user.uploadUserImage(7, big)).toThrow(
      expect.objectContaining({ status: 413, kind: 'validation' }),
    )
    expect(called).toBe(false)
  })
})

describe('createGpInSeason', () => {
  const data = { name: 'Test GP', code: 'TST', round: 3, circuit: 4, variant: 2, laps: 50 }
  test('creates the GP, finds it by code+name (last match) and attaches it to the season', async () => {
    const calls: { m: string; p: string; b: unknown }[] = []
    server.use(
      http.all('*/v2/*', async ({ request }) => {
        const text = await request.text()
        calls.push({
          m: request.method,
          p: new URL(request.url).pathname,
          b: text ? JSON.parse(text) : undefined,
        })
        if (request.method === 'GET')
          return ok([
            { id: 10, name: 'Test GP', code: 'TST' },
            { id: 11, name: 'Other', code: 'TST' },
            { id: 12, name: 'Test GP', code: 'TST' },
          ])
        return ok(null)
      }),
    )
    const gp = await admin.createGpInSeason(9, data)
    expect(gp.id).toBe(12)
    expect(calls.map((c) => `${c.m} ${c.p}`)).toEqual([
      'POST /v2/gps/',
      'GET /v2/gps',
      'POST /v2/seasons/9/gps',
    ])
    expect(calls[0]!.b).toEqual({ name: 'Test GP', code: 'TST' })
    expect(calls[2]!.b).toEqual({ gp: 12, circuit: '4', variant: '2', laps: 50, round: 3 })
  })
  test('fails clearly when the created GP is not in the list', async () => {
    server.use(http.all('*/v2/*', ({ request }) => ok(request.method === 'GET' ? [] : null)))
    await expect(admin.createGpInSeason(9, data)).rejects.toThrow(/no aparece en el listado/)
  })
})

describe('updateGpData', () => {
  async function run(changes: Parameters<typeof admin.updateGpData>[3]) {
    const calls: { m: string; p: string; b: unknown }[] = []
    server.use(
      http.all('*/v2/*', async ({ request }) => {
        calls.push({
          m: request.method,
          p: new URL(request.url).pathname,
          b: await request.json(),
        })
        return ok(null)
      }),
    )
    await admin.updateGpData(1, 9, 3, changes)
    return calls
  }
  test('only name/code -> a single PUT /gps/{id}', async () => {
    expect(await run({ name: 'N', code: 'C' })).toEqual([
      { m: 'PUT', p: '/v2/gps/3', b: { name: 'N', code: 'C' } },
    ])
  })
  test('only season data -> a single PUT on the season scope, ids as strings', async () => {
    expect(await run({ round: 4, laps: 60, circuit: 5, variant: 6 })).toEqual([
      { m: 'PUT', p: '/v2/gps/1/9/3', b: { round: 4, laps: 60, circuit: '5', variant: '6' } },
    ])
  })
  test('both -> two calls, base data first', async () => {
    const calls = await run({ name: 'N', round: 2 })
    expect(calls.map((c) => c.p)).toEqual(['/v2/gps/3', '/v2/gps/1/9/3'])
  })
  test('nothing changed -> no request', async () => {
    expect(await run({})).toEqual([])
  })
})

describe('createDriverAndFind / createConstructorAndFind', () => {
  test('driver id comes from the last list match by code', async () => {
    server.use(
      http.all('*/v2/drivers', ({ request }) =>
        ok(
          request.method === 'GET'
            ? [
                { id: 1, code: 'VER' },
                { id: 9, code: 'VER' },
                { id: 2, code: 'HAM' },
              ]
            : null,
        ),
      ),
    )
    await expect(
      admin.createDriverAndFind({ firstname: 'M', lastname: 'V', code: 'VER' }),
    ).resolves.toBe(9)
  })
  test('driver missing from the list -> error', async () => {
    server.use(http.all('*/v2/drivers', ({ request }) => ok(request.method === 'GET' ? [] : null)))
    await expect(
      admin.createDriverAndFind({ firstname: 'M', lastname: 'V', code: 'VER' }),
    ).rejects.toThrow(/piloto/)
  })
  test('constructor id comes from the last list match by name', async () => {
    server.use(
      http.all('*/v2/constructors*', ({ request }) =>
        ok(
          request.method === 'GET'
            ? [
                { id: 3, name: 'A' },
                { id: 8, name: 'A' },
              ]
            : null,
        ),
      ),
    )
    await expect(admin.createConstructorAndFind('A')).resolves.toBe(8)
  })
  test('constructor missing -> error', async () => {
    server.use(
      http.all('*/v2/constructors*', ({ request }) => ok(request.method === 'GET' ? [] : null)),
    )
    await expect(admin.createConstructorAndFind('A')).rejects.toThrow(/equipo/)
  })
})

describe('list schemas in admin', () => {
  test('TimezonesSchema accepts the real map and the spec Pair[]', () => {
    expect(admin.TimezonesSchema.parse({ 'Europe/Madrid': '+02:00', UTC: '+00:00' })).toEqual([
      'Europe/Madrid',
      'UTC',
    ])
    expect(admin.TimezonesSchema.parse([{ key: 'A' }, { value: 'B' }, {}])).toEqual(['A', 'B'])
    expect(admin.TimezonesSchema.safeParse('x').success).toBe(false)
  })
  test('ChannelsSchema accepts a list and a map', () => {
    expect(admin.ChannelsSchema.parse({ mail: 'Email' })).toEqual([
      { id: 'mail', label: 'Email', enabled: true },
    ])
    expect(
      admin.ChannelsSchema.parse([{ id: 'tg', enabled: false }, { id: 'm', label: 'M' }, {}]),
    ).toEqual([
      { id: 'tg', label: 'tg', enabled: false },
      { id: 'm', label: 'M', enabled: true },
      { id: '', label: '', enabled: true },
    ])
  })
})

describe('findCommunityByInvitation', () => {
  const base = { open: true, members_amount: 3, user_is_member: false }
  const list = [
    { ...base, id: 1, name: 'A', invitation: ' AbC12 ' },
    { ...base, id: 2, name: 'B', invitation: 'zzz' },
    { ...base, id: 3, name: 'C' },
  ]
  test.each([
    ['abc12', 1],
    ['  ZZZ ', 2],
    ['nope', undefined],
    ['   ', undefined],
  ])('code %j -> %s', async (code, id) => {
    server.use(http.get('*/v2/communities', () => ok(list)))
    expect((await communities.findCommunityByInvitation(code))?.id).toBe(id)
  })
})

describe('getCommunityRuleset', () => {
  test('uses the community default rule set without requesting the missing route', async () => {
    const paths: string[] = []
    server.use(
      http.all('*/v2/*', ({ request }) => {
        paths.push(new URL(request.url).pathname)
        return ok({
          name: 'C',
          open: true,
          user_is_member: true,
          defaultRuleSet: { id: 7, public: true },
        })
      }),
    )
    const rs = await catalog.getCommunityRuleset(5, 1, 9)
    expect(rs.id).toBe(7)
    expect(paths).toEqual(['/v2/communities/5'])
  })
})
