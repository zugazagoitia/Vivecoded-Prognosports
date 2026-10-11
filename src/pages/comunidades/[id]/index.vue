<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsRoot } from 'reka-ui'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import CommunityTabList from '@/components/community/CommunityTabList.vue'
import InviteCard from '@/components/community/InviteCard.vue'
import LeaveCard from '@/components/community/LeaveCard.vue'
import MembersCard from '@/components/community/MembersCard.vue'
import MyPositionCard from '@/components/community/MyPositionCard.vue'
import RulesCard from '@/components/community/RulesCard.vue'
import SeasonsCard from '@/components/community/SeasonsCard.vue'
import WeekendCard from '@/components/community/WeekendCard.vue'
import { ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { toaster } from '@/composables/useToast'
import { isOwner, seasonSessions } from '@/lib/community'
import {
  useCommunityDetail,
  useCommunityPermissions,
  useCommunityRuleset,
  useCommunitySeason,
  useCommunityStandings,
  useCommunityWeekend,
  useLeaveCommunity,
  usePastSeasons,
  useRegenerateInvitation,
  type SeasonArgs,
} from '@/queries/community'
import { useSessionStore } from '@/stores/session'

/**
 * Community home (H5), `/comunidades/:id`: header, tabs Miembros / Reglas / Temporadas (kept in
 * `?tab=`) and an aside with the GP in progress, the invitation, your place and leaving.
 *
 * Access: needs a session; the user must be a member (`Community.userIsMember`). Not a member (or a
 * 403) -> redirect to `/unirse/{código}` when the link carries `?codigo=`, else to `/comunidades`
 * with an info toast. An unknown id (the API answers 200 + `success:false`) shows an own 404.
 * The creator cannot leave (see `LeaveCard`). «Han pronosticado…» and the «GP en curso» column are
 * omitted: other people's predictions are private until the session closes (no endpoint).
 */
definePage({
  meta: {
    layout: 'app',
    title: 'route.community',
    guards: ['auth', 'verified'],
    backHref: '/comunidades',
  },
})

const { t } = useI18n()
const route = useRoute('/comunidades/[id]/')
const router = useRouter()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)

const id = computed(() => String(route.params.id))
const TABS = ['miembros', 'reglas', 'temporadas'] as const
type Tab = (typeof TABS)[number]
const tab = computed<Tab>({
  get() {
    const q = route.query.tab
    const v = Array.isArray(q) ? q[0] : q
    return TABS.find((x) => x === v) ?? 'miembros'
  },
  set(v) {
    void router.replace({ query: { ...route.query, tab: v === 'miembros' ? undefined : v } })
  },
})
const tabs = computed(() => TABS.map((v) => ({ value: v, label: t(`community.tabs.${v}`) })))

const detail = useCommunityDetail(id)
const community = computed(() => detail.data.value)
const seasonQ = useCommunitySeason(community)
const args = computed<SeasonArgs>(() => ({
  community: id.value,
  competition: seasonQ.competition.value,
  season: seasonQ.data.value?.id,
}))
const standings = useCommunityStandings(community, args)
const perms = useCommunityPermissions(community, () => standings.members.data.value)
const ruleset = useCommunityRuleset(args, () => tab.value === 'reglas')
const weekend = useCommunityWeekend(
  args,
  () => standings.points.data.value,
  () => standings.gps.data.value,
)
const past = usePastSeasons(args, () => tab.value === 'temporadas')
const regenerate = useRegenerateInvitation(id)
const leave = useLeaveCommunity(id)

const me = computed(() => standings.rows.value?.find((r) => r.you))
const mine = computed(() => !!community.value && isOwner(community.value, session.user?.id))
const sessions = computed(() => seasonSessions(standings.gps.data.value ?? []))
const rankingTo = computed(() =>
  args.value.season != null ? `/ranking/${id.value}/${args.value.season}` : undefined,
)
const honoursTo = computed(() => (rankingTo.value ? `${rankingTo.value}/palmares` : undefined))
const seasonRows = computed(() => past.rows.value.map((r) => ({ ...r, season: r.season })))
const last = computed(() => {
  const l = weekend.last.value
  return l ? { ...l, gpName: l.gp?.name } : undefined
})

useMobileTitle(() => community.value?.name ?? t('community.mobileTitle'))

// Not a member: nothing of the community may be shown.
watch(
  () => detail.notMember.value,
  (denied) => {
    if (!denied) return
    const code = route.query.codigo
    const invitation = Array.isArray(code) ? code[0] : code
    if (invitation) void router.replace(`/unirse/${encodeURIComponent(invitation)}`)
    else {
      toaster.info(t('community.notMember'))
      void router.replace('/comunidades')
    }
  },
  { immediate: true },
)

function leaveNow() {
  leave.mutate(undefined, { onSuccess: () => void router.replace('/comunidades') })
}
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="detail.notFound.value">
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('community.home'), to: '/home' },
          { label: t('community.list'), to: '/comunidades' },
          { label: t('community.notFound.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{ t('community.notFound.title') }}</PTitle>
        <p class="text-muted max-w-md">{{ t('community.notFound.text') }}</p>
        <PButton to="/comunidades" icon="users">{{ t('community.notFound.action') }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('community.home'), to: '/home' },
          { label: t('community.list'), to: '/comunidades' },
          { label: community?.name ?? t('loading') },
        ]"
      />

      <ErrorState
        v-if="detail.isError.value && !detail.notMember.value"
        :what="t('community.error.community')"
        :error="detail.error.value"
        @retry="detail.refetch()"
      />
      <div v-else-if="!community || detail.notMember.value" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="avatar" />
        <Skeleton variant="line" :lines="3" class="max-w-xl" />
      </div>

      <template v-else>
        <CommunityHeader
          :community="community as typeof community & { id: number }"
          :season="seasonQ.data.value?.name ?? undefined"
          :you="mine"
          :can-settings="perms.settings"
          :ranking-to="rankingTo"
        />

        <TabsRoot v-model="tab" class="flex flex-col gap-6">
          <CommunityTabList :tabs="tabs" />
          <div class="split">
            <div class="flex min-w-0 flex-col gap-6">
              <TabsContent value="miembros" class="outline-none">
                <MembersCard
                  :rows="standings.rows.value"
                  :loading="standings.isLoading.value || seasonQ.isLoading.value"
                  :error="standings.error.value ?? seasonQ.error.value"
                  @retry="standings.refetch()"
                />
              </TabsContent>
              <TabsContent value="reglas" class="outline-none">
                <RulesCard
                  :ruleset="ruleset.data.value"
                  :sessions="sessions"
                  :season="seasonQ.data.value?.name ?? undefined"
                  :loading="ruleset.isLoading.value || standings.gps.isLoading.value"
                  :error="ruleset.error.value"
                  @retry="ruleset.refetch()"
                />
              </TabsContent>
              <TabsContent value="temporadas" class="outline-none">
                <SeasonsCard
                  :rows="seasonRows"
                  :community-id="id"
                  :honours-to="honoursTo"
                  :loading="past.isLoading.value"
                  :error="past.error.value"
                  @retry="past.refetch()"
                />
              </TabsContent>
            </div>

            <aside class="flex min-w-0 flex-col gap-6">
              <WeekendCard
                v-if="weekend.next.data.value && !weekend.hidden.value"
                :gp="weekend.next.data.value"
                :leaders="weekend.leaders.value"
                :last="last"
                :loading="weekend.weekend.isLoading.value"
                :error="weekend.weekend.error.value"
                @retry="weekend.weekend.refetch()"
              />
              <Skeleton v-else-if="weekend.next.isLoading.value" variant="card" />
              <InviteCard
                :invitation="community.invitation"
                :open="community.open"
                :can-regenerate="perms.recreateInvitation"
                :regenerating="regenerate.isPending.value"
                @regenerate="regenerate.mutate()"
              />
              <MyPositionCard
                :me="me"
                :loading="standings.isLoading.value"
                :error="standings.error.value"
                @retry="standings.refetch()"
              />
              <LeaveCard
                :name="community.name"
                :is-owner="mine"
                :leaving="leave.isPending.value"
                @leave="leaveNow"
              />
            </aside>
          </div>
        </TabsRoot>
      </template>
    </template>
  </div>
</template>
