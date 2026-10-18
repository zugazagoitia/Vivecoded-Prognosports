type Id = string | number

/**
 * Query-key factory. Every community-dependent key has the community id as its
 * SECOND element (`[area, community, ...]`) so it can be invalidated as a group.
 */
export const keys = {
  me: () => ['me'] as const,
  /** Public profile of one user (U2). */
  user: (user: Id) => ['user', user] as const,
  /** Account settings (U3). */
  timezones: () => ['timezones'] as const,
  authTokens: () => ['auth-tokens'] as const,
  notificationChannels: () => ['notification-channels'] as const,
  /** Public list of every community (H3). */
  exploreCommunities: () => ['explore-communities'] as const,
  userCommunities: (user: Id) => ['user-communities', user] as const,
  currentSeason: (competition: Id) => ['current-season', competition] as const,
  seasonCircuits: (season: Id) => ['season-circuits', season] as const,
  competitionSeasons: (competition: Id) => ['competition-seasons', competition] as const,
  competitions: () => ['competitions'] as const,
  rulesets: () => ['rulesets'] as const,
  nextGp: (competition: Id) => ['next-gp', competition] as const,
  gps: (competition: Id, season: Id) => ['gps', competition, season] as const,
  points: (community: Id, competition: Id, season: Id) =>
    ['points', community, competition, season] as const,
  totals: (community: Id, competition: Id, season: Id) =>
    ['totals', community, competition, season] as const,
  tipps: (community: Id, competition: Id, season: Id, ...rest: Id[]) =>
    ['tipps', community, competition, season, ...rest] as const,
  userResume: (community: Id, user: Id, competition: Id, season: Id) =>
    ['user-resume', community, user, competition, season] as const,
  members: (community: Id) => ['members', community] as const,
  /** Detail of one community (H5); also the group key of its settings (H6). */
  /** Community behind an invitation code (H7); public data. */
  invitation: (code: string) => ['invitation', code] as const,
  community: (community: Id) => ['community', community] as const,
  /** Rule set applied to a season (no GP) or to one GP of a community. */
  ruleset: (community: Id, competition: Id, season: Id, ...rest: Id[]) =>
    ['ruleset', community, competition, season, ...rest] as const,
  /** Number of communities using a rule set (H6). */
  rulesetUsages: (ruleset: Id) => ['ruleset-usages', ruleset] as const,
  /** Results of a session (public data, but the endpoint needs a session). */
  results: (competition: Id, season: Id, gp: Id, session: Id) =>
    ['results', competition, season, gp, session] as const,
  grid: (competition: Id, season: Id, gp: Id, session: Id) =>
    ['grid', competition, season, gp, session] as const,
  /** Public session data (F1 open data, not community-scoped). */
  publicSession: (season: Id, round: Id, kind: string) =>
    ['public-session', season, round, kind] as const,
}

/** Areas whose keys carry the community id at index 1. */
export const COMMUNITY_AREAS: ReadonlySet<unknown> = new Set([
  'community',
  'points',
  'totals',
  'tipps',
  'user-resume',
  'members',
  'ruleset',
])

/** Predicate matching community-scoped queries of one community (and nothing else). */
export function isCommunityKey(queryKey: readonly unknown[], community: Id): boolean {
  return COMMUNITY_AREAS.has(queryKey[0]) && String(queryKey[1]) === String(community)
}
