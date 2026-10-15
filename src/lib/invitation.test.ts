import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import {
  invitationState,
  inviteSubtitle,
  redirectUrl,
  rulesSentence,
  summarizeRules,
} from './invitation'

const t = i18n.global.t as (key: string, named?: Record<string, unknown>) => string

describe('invitationState', () => {
  it('member -> member', () => {
    expect(invitationState({ community: { userIsMember: true } })).toBe('member')
    expect(invitationState({ community: { userIsMember: false }, isMember: true })).toBe('member')
  })
  it('unknown code -> invalid', () => {
    expect(invitationState({ community: undefined })).toBe('invalid')
    expect(invitationState({ community: null })).toBe('invalid')
  })
  it('otherwise valid', () => {
    expect(invitationState({ community: { userIsMember: false } })).toBe('valid')
  })
})

describe('rulesSentence', () => {
  it('formats the classic set', () => {
    expect(rulesSentence(t, 'Clásica 2026', 5, 3, 1)).toBe(
      'Clásica 2026: 5 puntos por acierto exacto, 3 a una posición y 1 a dos.',
    )
  })
  it('works without a set name', () => {
    expect(rulesSentence(t, undefined, 5, 3, 1)).toBe(
      '5 puntos por acierto exacto, 3 a una posición y 1 a dos.',
    )
  })
})

describe('summarizeRules', () => {
  it('shows ranges for per-session maps and merges next/previous', () => {
    const s = summarizeRules({
      pointsByEqualsPosition: { '1': { '1': 20, '2': 16 }, '2': { '1': 25 } },
      pointsByNextPosition: { '1': 2 },
      pointsByPreviousPosition: { '1': 3 },
      pointsByNextOfFollowingPosition: { '1': 1 },
      pointsByPreviousOfPreviousPosition: { '1': 1 },
    })
    expect(s).toEqual({ exact: '16–25', near: '2–3', far: '1' })
  })
  it('is undefined without data', () => {
    expect(summarizeRules(undefined)).toBeUndefined()
  })
})

describe('redirectUrl', () => {
  it('encodes the invitation path', () => {
    expect(redirectUrl('PADDOCK-7KQ2')).toBe('/login?redirect=%2Funirse%2FPADDOCK-7KQ2')
  })
})

describe('inviteSubtitle', () => {
  it('joins owner, players and competition', () => {
    expect(
      inviteSubtitle(t, {
        owner: 'Irene Campos',
        members: '31 jugadores',
        competition: 'Fórmula 1 2026',
      }),
    ).toBe('Invitación de Irene Campos · 31 jugadores · Fórmula 1 2026')
  })
})
