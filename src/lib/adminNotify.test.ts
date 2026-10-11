import { describe, expect, it } from 'vitest'
import { mockGrandPrix } from '@/mocks/fixtures'
import {
  canSend,
  isSupportedChannel,
  recalcGps,
  relativeStamp,
  scopeLabel,
  TYPE_KEY,
} from './adminNotify'

describe('notifications', () => {
  it('canSend needs title, message and a channel', () => {
    expect(canSend({ t: '', m: 'x', canales: ['mail'] })).toBe(false)
    expect(canSend({ t: 'a', m: 'b', canales: [] })).toBe(false)
    expect(canSend({ t: 'a', m: 'b', canales: ['telegram'] })).toBe(true)
  })
  it('maps the five types and only keeps mail and telegram', () => {
    expect(Object.keys(TYPE_KEY)).toHaveLength(5)
    expect(isSupportedChannel('telegram')).toBe(true)
    expect(isSupportedChannel('web')).toBe(false)
  })
})

describe('recalculation', () => {
  it('lists played GPs newest first', () => {
    const now = Date.parse('2026-07-01T12:00:00Z')
    const list = recalcGps([mockGrandPrix(1), mockGrandPrix(3), mockGrandPrix(20)] as never, now)
    expect(list.map((g) => g.round)).toEqual([3, 1])
  })
  it('relative stamps', () => {
    const now = Date.parse('2026-07-10T12:00:00Z')
    expect(relativeStamp(now, Date.parse('2026-07-10T10:12:00Z'), 'UTC')).toEqual({
      kind: 'today',
      time: '10:12',
    })
    expect(relativeStamp(now, Date.parse('2026-07-09T18:40:00Z'), 'UTC')).toEqual({
      kind: 'yesterday',
      time: '18:40',
    })
    expect(relativeStamp(now, Date.parse('2026-07-04T18:40:00Z'), 'UTC')).toEqual({
      kind: 'days',
      n: 6,
    })
  })
  it('scope labels', () => {
    expect(scopeLabel('Azerbaiyán', 'Carrera')).toBe('Azerbaiyán · carrera')
    expect(scopeLabel('Azerbaiyán', null)).toBe('Azerbaiyán · todas')
  })
})
