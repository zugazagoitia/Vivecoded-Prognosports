import type { Community } from '@/api/schemas'
import { normalize } from '@/lib/circuits'

/** Pure logic of the read-only users (M10) and communities (M11) screens. */

/** «mar 2024»: abbreviated month without the trailing dot, and year. */
export function formatAlta(iso: string | null | undefined): string {
  const at = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(at)) return '—'
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(at)
    .replace('.', '')
}

export interface UserRow {
  id: number
  username: string
  email: string
  created: string | null
  verified: boolean
}

/** Maps a `User` to a row, keeping only what the table shows (never `hashedPassword`). */
export function userRow(u: {
  id: number
  username: string
  email?: string | null
  created?: string | null
  verified?: string | null
}): UserRow {
  return {
    id: u.id,
    username: u.username,
    email: u.email ?? '',
    created: u.created ?? null,
    verified: !!u.verified,
  }
}

/** Accent/case-insensitive filter on name and e-mail. */
export function filterUsers<T extends Pick<UserRow, 'username' | 'email'>>(
  users: readonly T[],
  query: string,
): T[] {
  const q = normalize(query)
  if (!q) return [...users]
  return users.filter((u) => normalize(`${u.username} ${u.email}`).includes(q))
}

export const USERS_PAGE_SIZE = 50

export type AccessTag = { key: 'open' | 'closed'; color: 'ok' | 'brand' }
export const accessTag = (c: Pick<Community, 'open'>): AccessTag =>
  c.open ? { key: 'open', color: 'ok' } : { key: 'closed', color: 'brand' }

export interface CommunityRow {
  id: number
  name: string
  open: boolean
  members: number
  rules: string | null
}

export function communityRow(c: Community): CommunityRow {
  return {
    id: c.id,
    name: c.name,
    open: c.open,
    members: c.membersAmount ?? 0,
    rules: c.defaultRuleSet?.displayname ?? null,
  }
}

/** Most players first (ties by name). */
export function sortByMembers<T extends Pick<CommunityRow, 'members' | 'name'>>(
  list: readonly T[],
) {
  return [...list].sort((a, b) => b.members - a.members || a.name.localeCompare(b.name, 'es'))
}
