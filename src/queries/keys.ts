type Id = string | number

/**
 * Query-key factory. Every community-dependent key has the community id as its
 * SECOND element (`[area, community, ...]`) so it can be invalidated as a group.
 */
export const keys = {
  me: () => ['me'] as const,
  userCommunities: (user: Id) => ['user-communities', user] as const,
  currentSeason: (competition: Id) => ['current-season', competition] as const,
  seasonCircuits: (season: Id) => ['season-circuits', season] as const,
  gps: (competition: Id, season: Id) => ['gps', competition, season] as const,
  points: (community: Id, competition: Id, season: Id) =>
    ['points', community, competition, season] as const,
  tipps: (community: Id, competition: Id, season: Id, ...rest: Id[]) =>
    ['tipps', community, competition, season, ...rest] as const,
  userResume: (community: Id, user: Id, competition: Id, season: Id) =>
    ['user-resume', community, user, competition, season] as const,
  members: (community: Id) => ['members', community] as const,
  /** Rule set applied to a season (no GP) or to one GP of a community. */
  ruleset: (community: Id, competition: Id, season: Id, ...rest: Id[]) =>
    ['ruleset', community, competition, season, ...rest] as const,
  /** Results of a session (public data, but the endpoint needs a session). */
  results: (competition: Id, season: Id, gp: Id, session: Id) =>
    ['results', competition, season, gp, session] as const,
  grid: (competition: Id, season: Id, gp: Id, session: Id) =>
    ['grid', competition, season, gp, session] as const,
}

/** Areas whose keys carry the community id at index 1. */
export const COMMUNITY_AREAS: ReadonlySet<unknown> = new Set([
  'points',
  'tipps',
  'user-resume',
  'members',
  'ruleset',
])

/** Predicate matching community-scoped queries of one community (and nothing else). */
export function isCommunityKey(queryKey: readonly unknown[], community: Id): boolean {
  return COMMUNITY_AREAS.has(queryKey[0]) && String(queryKey[1]) === String(community)
}
