import { describe, expect, it } from 'vitest'
import { mineOf } from './gp'

const row = (position: number, user?: number) => ({
  position,
  user: user ? { id: user } : undefined,
})

describe('mineOf', () => {
  const all = [row(1, 2), row(2, 2), row(1, 3), row(1)]
  it('keeps only the rows of the user (and the anonymous ones of the list form)', () => {
    expect(mineOf(all, 2).map((r) => r.position)).toEqual([1, 2, 1])
    expect(mineOf(all, 3).map((r) => r.user?.id)).toEqual([3, undefined])
  })
  it('never mixes other members in when the user is unknown', () => {
    expect(mineOf(all, undefined)).toEqual([row(1)])
  })
  it('handles no data', () => {
    expect(mineOf(undefined, 2)).toEqual([])
  })
})
