import type { Community } from '@/api/schemas'

/**
 * Pure helpers of «Explorar comunidades» (H3). `GET /v2/communities` returns every community
 * (no server-side filter, sort or paging that we know of): all of it is done on the client.
 */

export const EXPLORE_TABS = ['todas', 'abiertas', 'mias'] as const
export type ExploreTab = (typeof EXPLORE_TABS)[number]
export const EXPLORE_SORTS = ['jugadores', 'recientes', 'nombre'] as const
export type ExploreSort = (typeof EXPLORE_SORTS)[number]
export const EXPLORE_PAGE_SIZE = 10

export function parseTab(v: unknown): ExploreTab {
  return EXPLORE_TABS.find((t) => t === v) ?? 'todas'
}
export function parseSort(v: unknown): ExploreSort {
  return EXPLORE_SORTS.find((s) => s === v) ?? 'jugadores'
}

type Row = Pick<Community, 'name' | 'owner' | 'open' | 'userIsMember'>

/** Closed communities are never listed (one joins them with an invitation code), except your own. */
const isListed = (c: Row) => c.open || c.userIsMember

const inTab = (c: Row, tab: ExploreTab) =>
  isListed(c) &&
  (tab === 'todas' || (tab === 'abiertas' && c.open) || (tab === 'mias' && c.userIsMember))

/** Counters of the tabs, over the whole list (search not applied). */
export function tabCounts(list: readonly Row[]): Record<ExploreTab, number> {
  return Object.fromEntries(
    EXPLORE_TABS.map((t) => [t, list.filter((c) => inTab(c, t)).length]),
  ) as Record<ExploreTab, number>
}

/** Tab + case-insensitive substring of «name + creator». */
export function filterCommunities<T extends Row>(
  list: readonly T[],
  tab: ExploreTab,
  q: string,
): T[] {
  const needle = q.trim().toLowerCase()
  return list.filter(
    (c) =>
      inTab(c, tab) &&
      (!needle || `${c.name} ${c.owner?.username ?? ''}`.toLowerCase().includes(needle)),
  )
}

export function sortCommunities<T extends Pick<Community, 'name' | 'membersAmount' | 'created'>>(
  list: readonly T[],
  sort: ExploreSort,
): T[] {
  const time = (c: T) => (c.created ? new Date(c.created).getTime() || 0 : 0)
  const by = {
    jugadores: (a: T, b: T) => (b.membersAmount ?? 0) - (a.membersAmount ?? 0),
    recientes: (a: T, b: T) => time(b) - time(a),
    nombre: (a: T, b: T) => a.name.localeCompare(b.name, 'es'),
  }[sort]
  return [...list].sort(by)
}

export type RowAction = 'open' | 'join' | 'code'

/** One single action per row. */
export function rowAction(c: Pick<Community, 'open' | 'userIsMember'>): RowAction {
  return c.userIsMember ? 'open' : c.open ? 'join' : 'code'
}

/** «mar 2022» (UTC, Spanish, lower case, no dot); empty when the date is missing/invalid. */
export function formatCreated(created: string | null | undefined): string {
  const d = created ? new Date(created) : undefined
  if (!d || Number.isNaN(d.getTime())) return ''
  const month = new Intl.DateTimeFormat('es', { month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace('.', '')
    .toLowerCase()
  return `${month} ${d.getUTCFullYear()}`
}
