import { beforeEach, describe, expect, it } from 'vitest'
import { FLAG_NAMES, STORAGE_KEY, createFlags, isPreviewEnv } from './index'
import { isFlagEnabled, setFlagChecker } from '../router/flags'

function memStorage(initial?: string) {
  const m = new Map<string, string>(initial ? [[STORAGE_KEY, initial]] : [])
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('flags', () => {
  it('defines 12 flags', () => expect(FLAG_NAMES).toHaveLength(12))

  it('reads env true / false / absent', () => {
    const f = createFlags({
      env: { VITE_FF_GAP: 'true', VITE_FF_BUMP: 'false' },
      mode: 'production',
      storage: null,
    })
    expect(f.isEnabled('GAP')).toBe(true)
    expect(f.isEnabled('BUMP')).toBe(false)
    expect(f.isEnabled('HEATMAP')).toBe(false)
    expect(f.isEnabled('UNKNOWN')).toBe(false)
  })

  it('applies localStorage overrides outside production', () => {
    const f = createFlags({ env: {}, mode: 'beta', storage: memStorage('{"GAP":true}') })
    expect(f.isEnabled('GAP')).toBe(true)
    f.setOverride('BUMP', true)
    expect(f.isEnabled('BUMP')).toBe(true)
  })

  it('ignores localStorage in production', () => {
    const f = createFlags({ env: {}, mode: 'production', storage: memStorage('{"GAP":true}') })
    expect(f.isEnabled('GAP')).toBe(false)
    f.setOverride('GAP', true)
    expect(f.isEnabled('GAP')).toBe(false)
  })

  it('survives corrupt storage', () => {
    const f = createFlags({ env: {}, mode: 'beta', storage: memStorage('{nope') })
    expect(f.isEnabled('GAP')).toBe(false)
  })

  it('detects previews', () => {
    expect(isPreviewEnv({ VITE_PREVIEW: 'true' }, 'beta')).toBe(true)
    expect(isPreviewEnv({ VITE_PREVIEW: 'true' }, 'production')).toBe(false)
    expect(isPreviewEnv({}, 'development')).toBe(true)
    expect(isPreviewEnv({}, 'beta')).toBe(false)
  })
})

describe('route guard seam', () => {
  beforeEach(() =>
    setFlagChecker(createFlags({ env: {}, mode: 'production', storage: null }).isEnabled),
  )
  it('flagged route is off by default', () => expect(isFlagEnabled('GAP')).toBe(false))
})
