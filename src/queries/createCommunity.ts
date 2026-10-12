import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { catalogApi, communitiesApi, competitionsApi, userApi } from '@/api'
import type { Community } from '@/api/schemas'
import { buildRuleSetData, type PointsGrid } from '@/lib/createCommunity'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { keys } from './keys'

/**
 * Queries and mutation of «Crear comunidad» (H4).
 *
 * - `useCompetitions()`            `GET /v2/competitions`.
 * - `useCompetitionSeasons(id)`    `GET /v2/competitions/{id}/seasons`.
 * - `useCurrentSeasonId(id)`       `GET /v2/seasons/current/{id}` (default season, «en curso»).
 * - `useRulesets()`                `GET /v2/rulesets` (public or own).
 * - `useCreateCommunity()`         [`POST /v2/rulesets`] -> `POST /v2/communities` -> image.
 */

export function useCompetitions() {
  return useQuery({
    queryKey: keys.competitions(),
    queryFn: ({ signal }) => competitionsApi.listCompetitions(signal),
    staleTime: 5 * 60_000,
  })
}

export function useCompetitionSeasons(competition: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.competitionSeasons(toValue(competition))),
    queryFn: ({ signal }) => competitionsApi.listCompetitionSeasons(toValue(competition), signal),
    enabled: computed(() => !!toValue(competition)),
    staleTime: 5 * 60_000,
  })
}

export function useCurrentSeasonId(competition: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.currentSeason(toValue(competition))),
    queryFn: ({ signal }) => competitionsApi.getCurrentSeason(toValue(competition), signal),
    enabled: computed(() => !!toValue(competition)),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useRulesets() {
  return useQuery({
    queryKey: keys.rulesets(),
    queryFn: ({ signal }) => catalogApi.listRulesets(signal),
    staleTime: 60_000,
  })
}

export interface CreateCommunityInput {
  name: string
  description: string
  open: boolean
  /** Existing rule set id, or the name + editable grid of a new one. */
  rules:
    { kind: 'existing'; id: number | string } | { kind: 'new'; name: string; points: PointsGrid }
  image?: File | undefined
}

export interface CreateCommunityResult {
  community: Community
  /** `false` when the community exists but its image could not be uploaded. */
  imageUploaded: boolean
}

/**
 * Creates the community. With new rules, the rule set is created first (private to the user);
 * if the community call then fails, retrying the same rules reuses that rule set instead of
 * creating a duplicate. The image goes last (the endpoint needs the id): a failed upload does
 * not undo the creation. Afterwards the user's communities are refreshed and the new one
 * becomes the active one (decision, as when joining).
 */
export function useCreateCommunity() {
  const qc = useQueryClient()
  const session = useSessionStore()
  const store = useCommunityStore()
  let created: { key: string; id: number } | undefined
  return useMutation({
    mutationFn: async (input: CreateCommunityInput): Promise<CreateCommunityResult> => {
      let ruleSetId: number | string
      if (input.rules.kind === 'existing') ruleSetId = input.rules.id
      else {
        const data = buildRuleSetData(input.rules.points)
        const key = JSON.stringify([input.rules.name, data])
        if (created?.key !== key) {
          const rs = await catalogApi.createRuleset({
            displayname: input.rules.name,
            description: '',
            isPublic: false,
            data,
          })
          created = { key, id: Number(rs.id) }
          void qc.invalidateQueries({ queryKey: keys.rulesets() })
        }
        ruleSetId = created.id
      }
      const community = await communitiesApi.createCommunity({
        name: input.name,
        description: input.description,
        open: input.open,
        default_rule_set: Number(ruleSetId),
      })
      let imageUploaded = true
      if (input.image) {
        try {
          await communitiesApi.uploadCommunityImage(community.id, input.image)
        } catch {
          imageUploaded = false
        }
      }
      created = undefined
      const userId = session.user?.id
      if (userId != null) {
        const list = await userApi.listUserCommunities(userId)
        qc.setQueryData(keys.userCommunities(userId), list)
        store.setCommunities(list)
        if (list.some((c) => c.id === community.id)) store.select(community.id)
      }
      return { community, imageUploaded }
    },
  })
}
