import { describe, expect, it } from 'vitest'
import { EnvError, loadEnv, parseEnv } from './env'

const valid = {
  VITE_API_BASE_URL: 'https://api.prognosports.com',
  VITE_GIT_SHA: 'abc1234',
  VITE_GIT_DATE: '2026-10-10T00:00:00Z',
  VITE_APP_VERSION: '2.0.0',
}

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    expect(parseEnv(valid)).toEqual(valid)
  })
  it('names every offending variable', () => {
    try {
      parseEnv({ ...valid, VITE_API_BASE_URL: 'nope', VITE_GIT_SHA: undefined })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError)
      const issues = (e as EnvError).issues
      expect(issues).toHaveLength(2)
      expect(issues.join('\n')).toMatch(/VITE_API_BASE_URL: debe ser una URL válida/)
      expect(issues.join('\n')).toMatch(/VITE_GIT_SHA: falta la variable/)
    }
  })
  it('rejects a base URL that already ends in /v2 (the wrappers add the prefix)', () => {
    expect(() =>
      parseEnv({ ...valid, VITE_API_BASE_URL: 'https://api.prognosports.com/v2' }),
    ).toThrow(/no debe terminar en \/v2/)
  })
  it('loadEnv reads import.meta.env (test config provides it)', () => {
    expect(loadEnv().VITE_API_BASE_URL).toBe('http://api.test')
  })
})
