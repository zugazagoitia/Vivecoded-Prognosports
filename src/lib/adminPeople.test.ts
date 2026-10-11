import { describe, expect, it } from 'vitest'
import {
  accessTag,
  communityRow,
  filterUsers,
  formatAlta,
  sortByMembers,
  userRow,
} from './adminPeople'
import { initials } from './communities'

describe('users', () => {
  it('formatAlta gives month and year without a dot', () => {
    expect(formatAlta('2024-03-15T10:00:00Z')).toBe('mar 2024')
    expect(formatAlta('2025-09-01T10:00:00Z')).not.toContain('.')
    expect(formatAlta(null)).toBe('—')
  })
  it('initials of the first two words', () => {
    expect(initials('Álex Ruiz')).toBe('ÁR')
    expect(initials('marta')).toBe('M')
  })
  it('filters ignoring accents and searching the e-mail', () => {
    const list = [
      { username: 'Álex Ruiz', email: 'a@ejemplo.com' },
      { username: 'Marta', email: 'm@otro.com' },
    ]
    expect(filterUsers(list, 'alex')).toHaveLength(1)
    expect(filterUsers(list, '@ejemplo')).toHaveLength(1)
    expect(filterUsers(list, '')).toHaveLength(2)
  })
  it('maps a user to a row without the password', () => {
    const row = userRow({
      id: 1,
      username: 'a',
      email: 'a@b.c',
      hashedPassword: 'x',
      verified: 'yes',
    } as never)
    expect(Object.keys(row)).toEqual(['id', 'username', 'email', 'created', 'verified'])
    expect(row.verified).toBe(true)
  })
})

describe('communities', () => {
  it('access tags', () => {
    expect(accessTag({ open: true })).toEqual({ key: 'open', color: 'ok' })
    expect(accessTag({ open: false })).toEqual({ key: 'closed', color: 'brand' })
  })
  it('maps members and sorts by them', () => {
    const a = communityRow({
      id: 1,
      name: 'A',
      open: true,
      membersAmount: 31,
      defaultRuleSet: { displayname: 'Clásica' },
    } as never)
    const b = communityRow({ id: 2, name: 'B', open: false, membersAmount: 204 } as never)
    expect(a.members).toBe(31)
    expect(b.rules).toBeNull()
    expect(sortByMembers([a, b]).map((c) => c.id)).toEqual([2, 1])
  })
})
