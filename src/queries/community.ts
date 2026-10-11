import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQueries, useQuery } from '@tanstack/vue-query'
import {
  ApiError,
  catalogApi,
  communitiesApi,
  competitionsApi,
  gpsApi,
  type Community,
} from '@/api'
import { toaster } from '@/composables/useToast'
import { t } from '@/i18n'
import {
  buildStandings,
  lastScoredGpId,
  leadersOf,
  normaliseMembers,
  permissionsOf,
  seasonSortKey,
  summariseSeason,
  type PointsMap,
} from '@/lib/community'
import { parseUsages } from '@/lib/community-settings'
import { gpShortName } from '@/lib/gp'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { queryClient } from './client'
import { useSeasonGps } from './circuits'
import { isCommunityKey, keys } from './keys'

/**
 * Queries of ONE community (H5): detail, members with permissions, standings, rules, the GP in
 * progress, the invitation, leaving, and the past seasons. They take the community id from the
 * route (`:id`) as a getter, NOT the active community (a user can open any of their communities
 * without switching). H4/H6/H7 reuse `useCommunityDetail`, `useCommunityMembers`,
 * `useCommunityPermissions` and `useRegenerateInvitation`.
 *
 * All endpoints need a session. Unverifiable without one (README): response shapes follow
 * `schema.d.ts`.
 */

type Id = string | number

const authenticated = () => useSessionStore().isAuthenticated

/** The API answers 200 with `success:false` (surfaced as ApiError, status 200) for unknown ids. */
export function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === 'http' &&
    (error.status === 200 || error.status === 404 || error.status === 400)
  )
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'http' && error.status === 403
}

/**
 * `GET /v2/communities/{id}`. `notFound`: unknown id. `notMember`: `userIsMember === false` or
 * a 403 — the page redirects (see the page's doc).
 */
export function useCommunityDetail(id: MaybeRefOrGetter<Id>) {
  const q = useQuery({
    queryKey: computed(() => keys.community(toValue(id))),
    queryFn: ({ signal }) => communitiesApi.getCommunity(toValue(id), signal),
    enabled: computed(() => authenticated()),
  })
  return Object.assign(q, {
    notFound: computed(() => isNotFound(q.error.value)),
    notMember: computed(() => q.data.value?.userIsMember === false || isForbidden(q.error.value)),
  })
}

/** `GET .../members` normalised (see `normaliseMembers`). */
export function useCommunityMembers(
  id: MaybeRefOrGetter<Id>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => keys.members(toValue(id))),
    queryFn: async ({ signal }) =>
      normaliseMembers(await communitiesApi.listMembers(toValue(id), signal)),
    enabled: computed(() => authenticated() && toValue(enabled)),
  })
}

/** What the signed-in user may do in the community (owner or a delegated `can_*`). */
export function useCommunityPermissions(
  community: MaybeRefOrGetter<Pick<Community, 'owner'> | undefined>,
  members: MaybeRefOrGetter<ReturnType<typeof normaliseMembers> | undefined>,
) {
  const session = useSessionStore()
  return computed(() => {
    const c = toValue(community)
    const uid = session.user?.id
    return c
      ? permissionsOf(
          c,
          toValue(members)?.find((m) => m.id === uid),
          uid,
        )
      : { recreateInvitation: false, settings: false }
  })
}

/** Current season of the community's competition (the one its ranking is about). */
export function useCommunitySeason(community: MaybeRefOrGetter<Community | undefined>) {
  const competition = computed(() => toValue(community)?.competition?.id)
  const q = useQuery({
    queryKey: computed(() => keys.currentSeason(competition.value ?? '')),
    queryFn: ({ signal }) => competitionsApi.getCurrentSeason(competition.value!, signal),
    enabled: computed(() => authenticated() && competition.value != null),
  })
  return Object.assign(q, { competition })
}

export interface SeasonArgs {
  community: Id
  competition?: number
  season?: number
}

/** Points of every member in the season, `grandPrixId -> UserPoints[]`. */
export function useSeasonPoints(args: MaybeRefOrGetter<SeasonArgs>) {
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.points(a.community, a.competition ?? '', a.season ?? '')
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)
      return communitiesApi.getCommunityPoints(a.community, a.competition!, a.season!, signal)
    },
    enabled: computed(() => {
      const a = toValue(args)
      return authenticated() && a.competition != null && a.season != null
    }),
  })
}

/**
 * Standings of the community (rows with place, movement, form and role), from the season
 * points + members + season GP list. `rows` is undefined until all three have loaded.
 */
export function useCommunityStandings(
  community: MaybeRefOrGetter<Community | undefined>,
  args: MaybeRefOrGetter<SeasonArgs>,
) {
  const session = useSessionStore()
  const points = useSeasonPoints(args)
  const members = useCommunityMembers(() => toValue(args).community)
  const gps = useSeasonGps(
    () => toValue(args).competition ?? '',
    () => toValue(args).season,
  )
  const queries = [points, members, gps] as const
  const rows = computed(() => {
    const c = toValue(community)
    if (!c || !points.data.value || !members.data.value || !gps.data.value) return undefined
    return buildStandings({
      points: points.data.value,
      gps: gps.data.value,
      members: members.data.value,
      community: c,
      userId: session.user?.id,
      gpName: gpShortName,
    })
  })
  return {
    rows,
    points,
    members,
    gps,
    isLoading: computed(() => queries.some((q) => q.isLoading.value)),
    error: computed(() => queries.find((q) => q.isError.value)?.error.value ?? null),
    refetch: () => Promise.all(queries.filter((q) => q.isError.value).map((q) => q.refetch())),
  }
}

/** Rule set applied to the community in the season (shares its key with the GP weekend page). */
export function useCommunityRuleset(
  args: MaybeRefOrGetter<SeasonArgs>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => {
      const a = toValue(args)
      return keys.ruleset(a.community, a.competition ?? '', a.season ?? '')
    }),
    queryFn: ({ signal }) => {
      const a = toValue(args)
      return catalogApi.getCommunityRuleset(a.community, a.competition!, a.season!, signal)
    },
    enabled: computed(() => {
      const a = toValue(args)
      return authenticated() && a.competition != null && a.season != null && toValue(enabled)
    }),
  })
}

/**
 * «{GP} in the community»: the GP in progress (`GET /gps/{competition}/next`), the weekend
 * leader(s) (`points/{gp}`) and the last scored GP of the season (from the season points).
 * «Who has predicted» is NOT available (other people's predictions are private until each
 * session closes and there is no count endpoint): see the README of `src/api`.
 */
export function useCommunityWeekend(
  args: MaybeRefOrGetter<SeasonArgs>,
  points: MaybeRefOrGetter<PointsMap | undefined>,
  gps: MaybeRefOrGetter<readonly { id: number; round?: number | null; name: string }[] | undefined>,
) {
  const next = useQuery({
    queryKey: computed(() => keys.nextGp(toValue(args).competition ?? '')),
    queryFn: ({ signal }) => gpsApi.getNextGp(toValue(args).competition!, signal),
    enabled: computed(() => authenticated() && toValue(args).competition != null),
    // «No next GP» answers 404: that is a state (hide the card), not an error to retry.
    retry: false,
  })
  const nextId = computed(() => next.data.value?.id)
  const nextSeason = computed(() => next.data.value?.season?.id ?? toValue(args).season)
  const weekend = useQuery({
    queryKey: computed(() => [
      ...keys.points(
        toValue(args).community,
        toValue(args).competition ?? '',
        nextSeason.value ?? '',
      ),
      'gp',
      nextId.value ?? '',
    ]),
    queryFn: ({ signal }) =>
      communitiesApi.getCommunityPointsInGp(
        toValue(args).community,
        toValue(args).competition!,
        nextSeason.value!,
        nextId.value!,
        signal,
      ),
    enabled: computed(
      () =>
        authenticated() &&
        nextId.value != null &&
        nextSeason.value != null &&
        toValue(args).competition != null,
    ),
  })
  const last = computed(() => {
    const p = toValue(points)
    const g = toValue(gps)
    if (!p || !g) return undefined
    const id = lastScoredGpId(p, g, nextId.value)
    if (!id) return undefined
    const gp = g.find((x) => String(x.id) === id)
    return { gp, id, ...leadersOf(p[id]) }
  })
  return {
    next,
    weekend,
    leaders: computed(() => leadersOf(weekend.data.value)),
    last,
    /** No GP in progress (404 or none): hide the card. */
    hidden: computed(() => next.isError.value || (next.isSuccess.value && !next.data.value)),
  }
}

/**
 * Past seasons of the competition in which the community has points: champion, points and your
 * place. One request per season (newest first, at most `limit`); seasons with no points
 * (the community did not exist yet) are left out. Only runs when `enabled` (tab visible).
 */
export function usePastSeasons(
  args: MaybeRefOrGetter<SeasonArgs>,
  enabled: MaybeRefOrGetter<boolean>,
  limit = 8,
) {
  const session = useSessionStore()
  const seasons = useQuery({
    queryKey: computed(() => keys.competitionSeasons(toValue(args).competition ?? '')),
    queryFn: ({ signal }) =>
      competitionsApi.listCompetitionSeasons(toValue(args).competition!, signal),
    enabled: computed(
      () => authenticated() && toValue(args).competition != null && toValue(enabled),
    ),
  })
  const past = computed(() =>
    [...(seasons.data.value ?? [])]
      .filter((s) => s.id !== toValue(args).season)
      .sort((a, b) => seasonSortKey(b) - seasonSortKey(a))
      .slice(0, limit),
  )
  const results = useQueries({
    queries: computed(() =>
      past.value.map((s) => ({
        queryKey: keys.points(toValue(args).community, toValue(args).competition ?? '', s.id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          communitiesApi.getCommunityPoints(
            toValue(args).community,
            toValue(args).competition!,
            s.id,
            signal,
          ),
      })),
    ),
  })
  const rows = computed(() =>
    past.value.flatMap((season, i) => {
      const data = results.value[i]?.data
      const summary = data ? summariseSeason(data, session.user?.id) : undefined
      return summary ? [{ season, ...summary }] : []
    }),
  )
  return {
    rows,
    isLoading: computed(() => seasons.isLoading.value || results.value.some((r) => r.isLoading)),
    error: computed(() => {
      if (seasons.isError.value) return seasons.error.value
      // Show an error only when nothing could be loaded; partial data is still useful.
      const failed = results.value.filter((r) => r.isError)
      return failed.length && failed.length === results.value.length ? failed[0]!.error : null
    }),
    refetch: () =>
      Promise.all([
        seasons.refetch(),
        ...results.value.filter((r) => r.isError).map((r) => r.refetch()),
      ]),
  }
}

/** `POST .../recreate`; refreshes the detail (the new `invitation`). Errors toast globally. */
export function useRegenerateInvitation(id: MaybeRefOrGetter<Id>) {
  return useMutation({
    mutationFn: () => communitiesApi.recreateInvitation(toValue(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.community(toValue(id)) })
      toaster.success(t('community.invite.regenerated'))
    },
  })
}

/**
 * `POST .../quit`: removes the community from the user's lists and the cache. The caller
 * navigates away (H2). The creator cannot leave (decision in the page doc), so this is never
 * called for them.
 */
export function useLeaveCommunity(id: MaybeRefOrGetter<Id>) {
  const session = useSessionStore()
  const store = useCommunityStore()
  return useMutation({
    mutationFn: () => communitiesApi.quitCommunity(toValue(id)),
    onSuccess: async () => {
      const left = toValue(id)
      queryClient.removeQueries({ predicate: (q) => isCommunityKey(q.queryKey, left) })
      const uid = session.user?.id
      if (uid != null) {
        await queryClient.invalidateQueries({ queryKey: keys.userCommunities(uid) })
        // Reloads the store: if it was the active one, the first remaining becomes active.
        await store.load(uid).catch(() => undefined)
      }
      toaster.success(t('community.leave.done'))
    },
  })
}

/** Cached state touched by an image change: the detail and every list that shows the picture. */
async function refreshCommunityImage(id: Id) {
  const uid = useSessionStore().user?.id
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.community(id) }),
    uid != null ? queryClient.invalidateQueries({ queryKey: keys.userCommunities(uid) }) : null,
  ])
}

/** `POST .../image` (multipart, <= 2 MB, already cropped). Errors toast globally. */
export function useUploadCommunityImage(id: MaybeRefOrGetter<Id>) {
  return useMutation({
    mutationFn: (file: Blob) => communitiesApi.uploadCommunityImage(toValue(id), file),
    onSuccess: async () => {
      await refreshCommunityImage(toValue(id))
      toaster.success(t('communitySettings.image.uploaded'))
    },
  })
}

/** `DELETE .../image`: back to the initials. Errors toast globally. */
export function useDeleteCommunityImage(id: MaybeRefOrGetter<Id>) {
  return useMutation({
    mutationFn: () => communitiesApi.deleteCommunityImage(toValue(id)),
    onSuccess: async () => {
      await refreshCommunityImage(toValue(id))
      toaster.success(t('communitySettings.image.removed'))
    },
  })
}

/** `GET /v2/rulesets/{id}/usages` as a count (undefined when the body is not understood). */
export function useRulesetUsages(ruleset: MaybeRefOrGetter<Id | undefined>) {
  return useQuery({
    queryKey: computed(() => keys.rulesetUsages(toValue(ruleset) ?? '')),
    queryFn: async ({ signal }) =>
      parseUsages(await catalogApi.getRulesetUsages(toValue(ruleset)!, signal)) ?? null,
    enabled: computed(() => authenticated() && toValue(ruleset) != null),
    retry: false,
  })
}
