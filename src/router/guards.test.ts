import { describe, expect, it } from 'vitest'
import { evaluateGuards, sanitizeRedirect, type GuardName } from './guards'
import type { SessionUser } from './session'

const base: SessionUser = { id: '1', verified: true, isAdmin: false, hasCommunity: true }
const unverified = { ...base, verified: false }
const noCommunity = { ...base, hasCommunity: false }
const admin = { ...base, isAdmin: true }
const to = (fullPath: string) => ({ fullPath })
const app: GuardName[] = ['auth', 'verified', 'community']

describe('guards', () => {
  it('anonymous on a protected route goes to login with encoded redirect', () => {
    expect(evaluateGuards(to('/ranking/x/2026'), app, null)).toBe(
      '/login?redirect=%2Franking%2Fx%2F2026',
    )
  })
  it('unverified goes to /verificar', () => {
    expect(evaluateGuards(to('/home'), app, unverified)).toBe('/verificar')
  })
  it('without community goes to /comunidades', () => {
    expect(evaluateGuards(to('/home'), app, noCommunity)).toBe('/comunidades')
  })
  it('normal user passes', () => {
    expect(evaluateGuards(to('/home'), app, base)).toBe(true)
  })
  it('non admin on admin route gets /404', () => {
    expect(evaluateGuards(to('/admin/gps'), [...app, 'admin'], base)).toBe('/404')
  })
  it('admin passes', () => {
    expect(evaluateGuards(to('/admin/gps'), [...app, 'admin'], admin)).toBe(true)
  })
  it('anonymous on admin route ends in login, not 404', () => {
    expect(evaluateGuards(to('/admin/gps'), [...app, 'admin'], null)).toMatch(/^\/login\?redirect=/)
    expect(evaluateGuards(to('/admin/gps'), ['admin'], null)).toMatch(/^\/login\?redirect=/)
  })
  it('declaration order is irrelevant: canonical order wins', () => {
    expect(evaluateGuards(to('/x'), ['admin', 'community', 'verified', 'auth'], unverified)).toBe(
      '/verificar',
    )
  })
  it('home guard: session -> /home, anonymous stays', () => {
    expect(evaluateGuards(to('/'), ['home'], base)).toBe('/home')
    expect(evaluateGuards(to('/'), ['home'], null)).toBe(true)
  })
})

describe('sanitizeRedirect', () => {
  it('accepts internal paths', () => {
    expect(sanitizeRedirect('/ranking/x/2026?a=1#b')).toBe('/ranking/x/2026?a=1#b')
  })
  it.each([
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '',
    undefined,
    42,
    '/a\nb',
  ])('rejects %s', (v) => {
    expect(sanitizeRedirect(v)).toBeUndefined()
  })
})
