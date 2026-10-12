import type { UserPoints } from '@/api/schemas'
import type { BuildInput } from './ranking'

/** Small season shared by the unit tests of the ranking logic. */
const user = (id: number, username: string) => ({ id, username })
const row = (id: number, name: string, pts: number, acc: number, extra: object = {}) =>
  ({
    user: user(id, name),
    pointsInGP: pts,
    accumulatedPoints: acc,
    ...extra,
  }) as unknown as UserPoints

/** Ana wins GP 1 and 3, Beto GP 2; Carla ties Beto in GP 3 and misses GP 1. */
export const SAMPLE: BuildInput = {
  gps: [
    {
      id: 11,
      round: 1,
      name: 'Australia Grand Prix',
      code: 'AUS',
      sessions: [
        { id: 1, key: 1, code: 'Q', date: '2026-03-01T00:00:00Z' },
        { id: 2, key: 2, code: 'R' },
      ],
    },
    {
      id: 12,
      round: 2,
      name: 'China Grand Prix',
      code: 'CHN',
      sessions: [
        { id: 3, key: 4, code: 'SR' },
        { id: 4, key: 2, code: 'R' },
      ],
    },
    {
      id: 13,
      round: 3,
      name: 'Japan Grand Prix',
      code: 'JPN',
      sessions: [{ id: 5, key: 2, code: 'R' }],
    },
    {
      id: 14,
      round: 4,
      name: 'Pending Grand Prix',
      code: 'PEN',
      sessions: [{ id: 6, key: 2, code: 'R' }],
    },
  ] as BuildInput['gps'],
  points: {
    '11': [row(1, 'ana', 30, 30), row(2, 'beto', 20, 20)],
    '12': [row(1, 'ana', 10, 40), row(2, 'beto', 25, 45), row(3, 'carla', 5, 5)],
    '13': [row(1, 'ana', 30, 70), row(2, 'beto', 15, 60), row(3, 'carla', 15, 20)],
  },
  members: [1, 2, 3].map((id, i) => ({
    id,
    username: ['ana', 'beto', 'carla'][i]!,
    canRecreateInvitation: false,
    canModifyPermissions: false,
    canKickUsers: false,
  })),
  userId: 2,
}
