import { describe, expect, it } from 'vitest'
import { rosterFlags, teamKey } from './rosterMapping'

describe('teamKey (team aliases across sources)', () => {
  it('collapses the names one team has had', () => {
    expect(teamKey('RB F1 Team')).toBe(teamKey('Racing Bulls'))
    expect(teamKey('Visa Cash App RB')).toBe(teamKey('Racing Bulls'))
    expect(teamKey('Kick Sauber')).toBe(teamKey('Sauber'))
    expect(teamKey('Red Bull')).toBe(teamKey('Red Bull Racing'))
  })

  it('keeps different teams apart and folds accents and case', () => {
    expect(teamKey('Alpine F1 Team')).not.toBe(teamKey('Aston Martin'))
    expect(teamKey('  FERRARI ')).toBe(teamKey('Ferrari'))
    expect(teamKey(null)).toBe('')
  })
})

describe('rosterFlags', () => {
  it('flags a missing match, colour or team', () => {
    expect(rosterFlags({ appId: 1, color: '#fff', team: 'Ferrari' })).toEqual([])
    expect(rosterFlags({ appId: null, color: null, team: null })).toEqual([
      'unmatched',
      'no-colour',
      'no-team',
    ])
  })
})
