/**
 * Spec-vs-backend discrepancies (requisitos §24.7, src/api/README.md). Each test PASSES while
 * the discrepancy still exists and FAILS with instructions once the API fixes it, so the
 * client workarounds can be removed. All public, GET only.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { ApiError } from '../errors'
import { request } from '../client'
import { API_ORIGIN, REF, configureClient, live } from './harness'

interface Spec {
  paths: Record<string, Record<string, { summary?: string; parameters?: { name: string }[] }>>
  components: { schemas: Record<string, { properties?: Record<string, unknown> }> }
}

let spec: Spec

beforeAll(async () => {
  configureClient(false)
  spec = (await live('OpenAPI document GET /openapi', () => request('/openapi'))) as Spec
})

describe('§24.7 discrepancies', () => {
  it('invitation regeneration is still spelled `recretate` in the spec', () => {
    const paths = Object.keys(spec.paths)
    expect(
      paths.some((p) => p.endsWith('/recreate')),
      'The spec now says `/recreate`: set INVITATION_RECREATE_SEGMENT confirmation in communities.ts and update README #1.',
    ).toBe(false)
    expect(paths).toContain('/v2/communities/{community}/recretate')
  })

  it('the spec still documents the grid at `/{session}/grid` (without `sessions/`)', async () => {
    const paths = Object.keys(spec.paths)
    expect(paths).toContain('/v2/gps/{competition}/{season}/{grandprix}/{session}/grid')
    expect(
      paths,
      'The spec now matches the backend (`sessions/{session}/grid`): update README #2.',
    ).not.toContain('/v2/gps/{competition}/{season}/{grandprix}/sessions/{session}/grid')
    // ...while the backend does not serve the documented route (no token needed to see the 404).
    const { competition: c, season: s, grandPrix: g, session } = REF
    const err = await request(`/v2/gps/${c}/${s}/${g}/${session}/grid`).catch((e: unknown) => e)
    expect(
      err,
      'The backend now serves the documented grid route: the client workaround (README #2) can go.',
    ).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(404)
  })

  it('PUT .../sessions still declares an unused `session` path parameter', () => {
    const put = spec.paths['/v2/gps/{competition}/{season}/{grandprix}/sessions']?.put
    expect(
      put?.parameters?.some((p) => p.name === 'session'),
      'The spec no longer declares `session` on PUT .../sessions: update README #3.',
    ).toBe(true)
  })

  it('GET /competitions/{competition} still has the "update" summary', () => {
    const summary = spec.paths['/v2/competitions/{competition}']?.get?.summary ?? ''
    expect(summary, 'The summary was fixed in the spec.').toMatch(/actualiz/i)
  })

  it('UserPoints still has the `stadingsByHits` typo in the spec', () => {
    const props = spec.components.schemas.UserPoints?.properties ?? {}
    expect(
      'standingsByHits' in props,
      'The spec now has `standingsByHits`: the typo was fixed. Drop the `stadingsByHits` fallback in UserPointsSchema and update README #4.',
    ).toBe(false)
    expect('stadingsByHits' in props).toBe(true)
  })
})

describe('behaviour of the real API that the client works around (README «Contraste de mocks»)', () => {
  const raw = async (path: string, token?: string) => {
    const res = await fetch(`${API_ORIGIN}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return { status: res.status, text: await res.text() }
  }

  it('an invalid or missing token is HTTP 200 + success:false «No autorizado. Token…», not 401', async () => {
    for (const token of ['token-que-no-existe', undefined]) {
      const r = await raw('/v2/user/me', token)
      expect(
        r.status,
        'The API now answers 401 for a bad token: `authFailureStatus` (src/api/client.ts) can go.',
      ).toBe(200)
      const body = JSON.parse(r.text) as { success?: boolean; message?: string }
      expect(body.success).toBe(false)
      expect(body.message).toMatch(/^No autorizado\. Token/)
    }
  })

  it('«No tienes permiso» is also HTTP 200 + success:false', async () => {
    const r = await raw(`/v2/communities/${REF.community}/members`)
    expect(r.status).toBe(200)
    expect((JSON.parse(r.text) as { message?: string }).message).toMatch(
      /No autorizado\. No tienes permiso/,
    )
  })

  it('GET /v2/rulesets/{community}/{competition}/{season} (spec) still does not exist (404 text)', async () => {
    const { competition: c, season: s, community } = REF
    const r = await raw(`/v2/rulesets/${community}/${c}/${s}`)
    expect(
      r.status,
      'The backend now serves the community/season rule set: drop the `defaultRuleSet` fallback in `getCommunityRuleset` (src/api/catalog.ts) and update README.',
    ).toBe(404)
    expect(r.text).toMatch(/not found/)
  })

  it('POST /v2/communities/{id}/{invitation} (spec) is not a route: the real one is .../join/{invitation}', async () => {
    // GET on a route that only exists for POST also answers 404 «not found» with the unknown path.
    const spec = await raw(`/v2/communities/${REF.community}/ABC123`)
    expect(spec.status).toBe(404)
  })
})
