import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/vue-query'
import { communitiesApi, competitionsApi, gpsApi, userApi } from '@/api'
import { ApiError } from '@/api/errors'
import type { Community, GrandPrix } from '@/api/schemas'
import { closeTime, sortSessions } from '@/lib/gps'
import { computeStanding, parseInvitation, type Standing } from '@/lib/communities'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { DEFAULT_COMPETITION } from './circuits'
import { keys } from './keys'

/**
 * Queries and mutations of «Mis comunidades» (H2), reusable by explore (H3), create (H4),
 * settings (H6) and invitation (H7).
 *
 * - `useMyCommunities()`            communities of the signed-in user.
 * - `useCommunityStandings(...)`    own place / points / leader / evolution per community.
 * - `useCommunityPending(...)`      pending predictions of the next GP per community.
 * - `useJoinCommunity()`            join by code, link or known community id; activates it.
 * - `useActivateCommunity()`        «Hacer activa» (client side only).
 * - `useQuitCommunity()`            leave a community (the UI belongs to H5).
 */

type Id = string | number

export const competitionOf = (c: Pick<Community, 'competition'>): Id =>
  c.competition?.id ?? DEFAULT_COMPETITION

export function useMyCommunities() {
  const session = useSessionStore()
  return useQuery({
    queryKey: computed(() => keys.userCommunities(session.user?.id ?? '')),
    queryFn: ({ signal }) => userApi.listUserCommunities(session.user!.id, signal),
    enabled: computed(() => session.user?.id != null),
  })
}

export type StandingState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'empty' }
  | { status: 'ready'; standing: Standing }

export interface CommunityStandingItem {
  community: Community
  season: Id | undefined
  state: StandingState
}

/**
 * Standing of the user in each community for a season (default: the current season of the
 * community's competition). Computed from `GET …/{competition}/{season}/points` (see
 * `computeStanding`): the `totaluserpoints` response is undocumented. Shares query keys with
 * `useCommunityPoints`, so the cache is common.
 */
export function useCommunityStandings(
  communities: MaybeRefOrGetter<readonly Community[]>,
  season?: MaybeRefOrGetter<Id | undefined>,
) {
  const session = useSessionStore()
  // One season query per distinct competition (duplicate keys are not allowed in useQueries).
  const competitions = computed(() => [...new Set(toValue(communities).map(competitionOf))])
  const seasonQueries = useQueries({
    queries: computed(() =>
      competitions.value.map((comp) => ({
        queryKey: keys.currentSeason(comp),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          competitionsApi.getCurrentSeason(comp, signal),
        enabled: toValue(season) == null,
      })),
    ),
  })
  const seasonOf = (c: Community) =>
    seasonQueries.value[competitions.value.indexOf(competitionOf(c))]
  const seasonIds = computed(() =>
    toValue(communities).map((c) => toValue(season) ?? seasonOf(c)?.data?.id),
  )
  const pointQueries = useQueries({
    queries: computed(() =>
      toValue(communities).map((c, i) => ({
        queryKey: keys.points(c.id, competitionOf(c), seasonIds.value[i] ?? ''),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          communitiesApi.getCommunityPoints(c.id, competitionOf(c), seasonIds.value[i]!, signal),
        enabled: seasonIds.value[i] != null,
      })),
    ),
  })
  const items = computed<CommunityStandingItem[]>(() =>
    toValue(communities).map((community, i) => {
      const sq = seasonOf(community)
      const pq = pointQueries.value[i]
      const seasonId = seasonIds.value[i]
      let state: StandingState
      if (toValue(season) == null && sq?.isError) state = { status: 'error', error: sq.error }
      else if (pq?.isError) state = { status: 'error', error: pq.error }
      else if (!pq || seasonId == null || pq.isPending) state = { status: 'loading' }
      else {
        const standing = computeStanding(pq.data, session.user?.id, community.membersAmount)
        state = standing ? { status: 'ready', standing } : { status: 'empty' }
      }
      return { community, season: seasonId, state }
    }),
  )
  function refetch() {
    for (const q of [...seasonQueries.value, ...pointQueries.value]) if (q.isError) void q.refetch()
  }
  return { items, refetch }
}

export interface PendingInfo {
  /** Short name of the next GP (not localised: as sent by the API, suffix removed by the UI). */
  gp: GrandPrix
  /** Sessions still open without own prediction. */
  pending: number
}

/**
 * Pending predictions of the NEXT GP per community: open sessions (closing time in the future)
 * without a prediction of the user in that community. One `GET …/tipps/{community}` per session
 * and community (same keys as `useGpTippStatus`, so the cache is shared for the active one).
 * `info[i]` is undefined while loading, when there is no next GP or when a request failed
 * (the card then simply omits the row). Assumes the next GP belongs to the competition's
 * current season.
 */
export function useCommunityPending(
  communities: MaybeRefOrGetter<readonly Community[]>,
  now: MaybeRefOrGetter<number>,
) {
  const competitions = computed(() => [...new Set(toValue(communities).map(competitionOf))])
  const nexts = useQueries({
    queries: computed(() =>
      competitions.value.map((comp) => ({
        queryKey: keys.nextGp(comp),
        queryFn: ({ signal }: { signal: AbortSignal }) => gpsApi.getNextGp(comp, signal),
        retry: false,
      })),
    ),
  })
  const seasons = useQueries({
    queries: computed(() =>
      competitions.value.map((comp) => ({
        queryKey: keys.currentSeason(comp),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          competitionsApi.getCurrentSeason(comp, signal),
      })),
    ),
  })
  /** One entry per (community, session) to ask for. */
  const targets = computed(() =>
    toValue(communities).flatMap((community, ci) => {
      const k = competitions.value.indexOf(competitionOf(community))
      const gp = nexts.value[k]?.data
      const seasonId = seasons.value[k]?.data?.id
      if (!gp || seasonId == null) return []
      return sortSessions(gp.sessions)
        .filter((s) => closeTime(s) > toValue(now))
        .map((s) => ({ ci, community, comp: competitionOf(community), seasonId, gp, session: s }))
    }),
  )
  const tipps = useQueries({
    queries: computed(() =>
      targets.value.map((x) => ({
        queryKey: keys.tipps(x.community.id, x.comp, x.seasonId, x.gp.id, x.session.id, 'mine'),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          gpsApi.getTipps(x.comp, x.seasonId, x.gp.id, x.session.id, x.community.id, signal),
        retry: false,
      })),
    ),
  })
  const info = computed<(PendingInfo | undefined)[]>(() =>
    toValue(communities).map((community, ci) => {
      const k = competitions.value.indexOf(competitionOf(community))
      const gp = nexts.value[k]?.data
      if (!gp) return undefined
      let pending = 0
      let known = true
      targets.value.forEach((x, ti) => {
        if (x.ci !== ci) return
        const q = tipps.value[ti]
        if (!q || !q.isSuccess) known = false
        else if ((q.data?.length ?? 0) === 0) pending++
      })
      return known ? { gp, pending } : undefined
    }),
  )
  return { info }
}

/** 606 «Invalid invitation» (spec) or any 4xx except an expired session. */
const isRejectedInvitation = (status: number) =>
  status === 606 || (status >= 400 && status < 500 && status !== 401)

/** Error shown for any failed join: expired/unknown code. */
export class InvalidInvitationError extends Error {
  constructor() {
    super('invalid invitation')
    this.name = 'InvalidInvitationError'
  }
}

export interface JoinInput {
  /** Code or invitation link as typed by the user. */
  code: string
  /** When the community is already known (invitation page, H7), skips the lookup. */
  communityId?: Id
}

/**
 * Joins a community and makes it the active one (decision: joining activates it). Rejects with
 * `InvalidInvitationError` for an empty/unknown/rejected code (API status 606 «Invalid
 * invitation» or a 4xx); other errors (network, 5xx) are passed through as `ApiError`.
 * Resolves with the joined community. Refreshes the user's communities in cache and in the store.
 */
export function useJoinCommunity() {
  const qc = useQueryClient()
  const session = useSessionStore()
  const store = useCommunityStore()
  return useMutation({
    mutationFn: async ({ code, communityId }: JoinInput): Promise<Community> => {
      const invitation = parseInvitation(code)
      if (!invitation) throw new InvalidInvitationError()
      let id = communityId
      if (id == null) {
        const found = await communitiesApi.findCommunityByInvitation(invitation)
        if (!found) throw new InvalidInvitationError()
        id = found.id
      }
      try {
        await communitiesApi.joinCommunity(id, invitation)
      } catch (e) {
        if (e instanceof ApiError && isRejectedInvitation(e.status)) {
          throw new InvalidInvitationError()
        }
        throw e
      }
      const list = await userApi.listUserCommunities(session.user!.id)
      qc.setQueryData(keys.userCommunities(session.user!.id), list)
      store.setCommunities(list)
      const joined = list.find((c) => String(c.id) === String(id))
      if (!joined) throw new InvalidInvitationError()
      store.select(joined.id)
      return joined
    },
  })
}

/**
 * «Hacer activa»: client-side only (Pinia + localStorage, §4.10). It is NOT synced to
 * `User.currentCommunity` (the PATCH payload shape is undocumented; deliberate).
 */
export function useActivateCommunity() {
  const store = useCommunityStore()
  return (id: number) => store.select(id)
}

/** Leaves a community and refreshes the lists; the active community falls back to another one. */
export function useQuitCommunity() {
  const qc = useQueryClient()
  const session = useSessionStore()
  const store = useCommunityStore()
  return useMutation({
    mutationFn: async (community: Id) => {
      await communitiesApi.quitCommunity(community)
      const list = await userApi.listUserCommunities(session.user!.id)
      qc.setQueryData(keys.userCommunities(session.user!.id), list)
      store.setCommunities(list)
    },
  })
}

/**
 * Community behind an invitation code (H7). Resolved from the public list (no session needed, see
 * `findCommunityByInvitation`). `data` is `null` when no community has that code (expired link).
 * `isMember` is also derived from the user's own list when signed in.
 */
export function useInvitation(code: MaybeRefOrGetter<string>) {
  const session = useSessionStore()
  const mine = useMyCommunities()
  const parsed = computed(() => parseInvitation(toValue(code)))
  const query = useQuery({
    queryKey: computed(() => keys.invitation(parsed.value)),
    queryFn: async ({ signal }) =>
      (await communitiesApi.findCommunityByInvitation(parsed.value, signal)) ?? null,
    enabled: computed(() => parsed.value !== ''),
    retry: false,
  })
  const isMember = computed(
    () =>
      session.user != null &&
      query.data.value != null &&
      (mine.data.value ?? []).some((c) => String(c.id) === String(query.data.value!.id)),
  )
  return { query, parsed, isMember, mine }
}
