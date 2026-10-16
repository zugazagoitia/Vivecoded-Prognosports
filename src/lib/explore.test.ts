import { describe, expect, it } from 'vitest'
import { CommunitySchema } from '@/api/schemas'
import { mockCommunity, mockUser } from '@/test/render'
import { initials } from './communities'
import {
  EXPLORE_TABS,
  filterCommunities,
  formatCreated,
  parseSort,
  parseTab,
  rowAction,
  sortCommunities,
  tabCounts,
} from './explore'

const irene = mockUser({ id: 2, username: 'Irene Campos' })
const make = (o: Parameters<typeof mockCommunity>[0]) => CommunitySchema.parse(mockCommunity(o))
const list = [
  make({
    id: 1,
    name: 'Oficina F1',
    open: true,
    owner: irene,
    members_amount: 5,
    created: '2024-02-01T10:00:00Z',
    user_is_member: false,
  }),
  make({
    id: 2,
    name: 'Ángeles',
    open: false,
    members_amount: 30,
    created: '2022-03-14T10:00:00Z',
    user_is_member: true,
  }),
  make({
    id: 3,
    name: 'Zeta',
    open: false,
    members_amount: 12,
    created: '2025-01-01T10:00:00Z',
    user_is_member: false,
  }),
  make({
    id: 4,
    name: 'Alfa',
    open: true,
    members_amount: 12,
    created: '2023-01-01T10:00:00Z',
    user_is_member: true,
  }),
]
const names = (l: { name: string }[]) => l.map((c) => c.name)

describe('explore helpers', () => {
  it('counts and filters by tab', () => {
    expect(tabCounts(list)).toEqual({ todas: 3, abiertas: 2, mias: 2 })
    expect(names(filterCommunities(list, 'abiertas', ''))).toEqual(['Oficina F1', 'Alfa'])
    expect(names(filterCommunities(list, 'todas', ''))).toEqual(['Oficina F1', 'Ángeles', 'Alfa'])
    expect(names(filterCommunities(list, 'mias', ''))).toEqual(['Ángeles', 'Alfa'])
  })
  it('searches name or creator, ignoring case and edge spaces, combined with the tab', () => {
    expect(names(filterCommunities(list, 'todas', '  irene '))).toEqual(['Oficina F1'])
    expect(names(filterCommunities(list, 'mias', 'oficina'))).toEqual([])
  })
  it('sorts', () => {
    expect(names(sortCommunities(list, 'jugadores'))).toEqual([
      'Ángeles',
      'Zeta',
      'Alfa',
      'Oficina F1',
    ])
    expect(names(sortCommunities(list, 'recientes'))).toEqual([
      'Zeta',
      'Oficina F1',
      'Alfa',
      'Ángeles',
    ])
    expect(names(sortCommunities(list, 'nombre'))).toEqual([
      'Alfa',
      'Ángeles',
      'Oficina F1',
      'Zeta',
    ])
  })
  it('chooses one action per row', () => {
    expect(rowAction({ open: false, userIsMember: true })).toBe('open')
    expect(rowAction({ open: true, userIsMember: false })).toBe('join')
    expect(rowAction({ open: false, userIsMember: false })).toBe('code')
  })
  it('formats the creation date', () => {
    expect(formatCreated('2022-03-14T10:00:00Z')).toBe('mar 2022')
    expect(formatCreated(undefined)).toBe('')
  })
  it('parses query values with defaults', () => {
    expect(parseTab('cerradas')).toBe('todas')
    expect(parseTab('x')).toBe('todas')
    expect(parseSort(undefined)).toBe('jugadores')
  })
  it('initials', () => expect(initials('Racing Club Sevilla')).toBe('RC'))
})

describe('explore: closed communities are never listed', () => {
  it('hides closed communities you are not a member of, in every tab', () => {
    for (const tab of EXPLORE_TABS)
      expect(names(filterCommunities(list, tab, ''))).not.toContain('Zeta')
    expect(EXPLORE_TABS).not.toContain('cerradas')
  })
})
