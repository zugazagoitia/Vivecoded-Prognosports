<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { apiUrl } from '@/api/client'
import type { User } from '@/api/schemas'
import DuelCard from '@/components/profile/DuelCard.vue'
import { ErrorState, Skeleton } from '@/components/states'
import AppImage from '@/components/ui/AppImage.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Kpi from '@/components/ui/Kpi.vue'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { useFlag } from '@/flags'
import { playedGpIds } from '@/lib/community'
import { sessionPath, gpShortName } from '@/lib/gp'
import {
  average,
  commonCommunities,
  cumulativeDiff,
  duelScore,
  formatAvg,
  genderOf,
  lastClosedGp,
  ordinal,
  pointsSeries,
} from '@/lib/userProfile'
import { useHomeScope } from '@/queries/home'
import { useCommunityStandings, type SeasonArgs } from '@/queries/community'
import { useUserCommunities, useUserResume } from '@/queries/resources'
import { useSessionStore } from '@/stores/session'
import { formatPoints } from '@/lib/gp'
import { formatNumber } from '@/utils/numbers'

/**
 * Public profile of ANOTHER member (U2): identity, the duel with you in the active community's
 * season (GP won, cumulative difference, form) and four compared figures. Read-only.
 * «Campeón/a» and «Nivel» tags are omitted: the API has no data for them (⚠️ U2 spec).
 * Props: `user` (the loaded `GET /v2/user/{user}`).
 */
const props = defineProps<{ user: User }>()
const { t } = useI18n()
const session = useSessionStore()
const mobile = useMediaQuery(MOBILE_QUERY)
const headToHead = useFlag('HEAD_TO_HEAD')
const scope = useHomeScope()

const name = computed(() => props.user.username)
useMobileTitle(name)

const community = computed(() => scope.active.value ?? undefined)
const args = computed<SeasonArgs>(() => ({
  community: scope.activeId.value ?? '',
  competition: scope.competitionId.value,
  season: scope.seasonId.value,
}))
const standings = useCommunityStandings(community, args)
const meId = computed(() => session.user?.id)
const gender = computed(() => genderOf(props.user.gender))
const year = computed(() => scope.season.value?.name ?? '')

const isMember = computed(
  () => standings.members.data.value?.some((m) => m.id === props.user.id) ?? false,
)
const rows = computed(() => standings.rows.value)
const me = computed(() => rows.value?.find((r) => r.id === meId.value))
const them = computed(() => rows.value?.find((r) => r.id === props.user.id))

const gpIds = computed(() =>
  standings.points.data.value && standings.gps.data.value
    ? playedGpIds(standings.points.data.value, standings.gps.data.value)
    : [],
)
const gpNames = computed(() =>
  gpIds.value.map((id) => {
    const gp = standings.gps.data.value?.find((g) => String(g.id) === id)
    return gp ? gpShortName(gp) : id
  }),
)
const mine = computed(() =>
  meId.value != null && standings.points.data.value
    ? pointsSeries(standings.points.data.value, gpIds.value, meId.value)
    : [],
)
const theirs = computed(() =>
  standings.points.data.value
    ? pointsSeries(standings.points.data.value, gpIds.value, props.user.id)
    : [],
)
const duel = computed(() => duelScore(mine.value, theirs.value))
const cum = computed(() => cumulativeDiff(mine.value, theirs.value))

const resumeArgs = [scope.competitionId, scope.seasonId] as const
const theirResume = useUserResume(() => props.user.id, ...resumeArgs)
const myResume = useUserResume(meId, ...resumeArgs)
const won = (r: { wonGrandPrixes?: unknown[] | null } | undefined) => r?.wonGrandPrixes?.length

const theirCommunities = useUserCommunities(() => props.user.id)
const common = computed(() =>
  theirCommunities.data.value
    ? commonCommunities(theirCommunities.data.value, scope.communities.value)
    : undefined,
)

const closed = computed(() => {
  const gps = standings.gps.data.value
  return gps ? lastClosedGp(gps, Date.now()) : undefined
})
const predictionsTo = computed(() => {
  const c = closed.value
  return c
    ? {
        path: sessionPath(c.gp, 'resultados', c.session),
        query: { usuario: String(props.user.id) },
      }
    : undefined
})

const base = computed(() => `/ranking/${scope.activeId.value ?? 0}/${scope.seasonId.value ?? ''}`)
const h2hTo = computed(() => ({
  path: `${base.value}/comparar/cara-a-cara`,
  query: { rival: String(props.user.id) },
}))

const since = computed(() => {
  const y = props.user.created ? new Date(props.user.created).getUTCFullYear() : NaN
  return Number.isFinite(y) ? t('userProfile.header.since', { year: y }) : ''
})
const meta = computed(() =>
  [
    t('userProfile.header.meta', { username: props.user.username }),
    props.user.location,
    since.value,
  ]
    .filter(Boolean)
    .join(' · '),
)
const photoFailed = ref(false)
const photo = computed(() =>
  props.user.hasProfileImage && !photoFailed.value
    ? apiUrl(`/v2/user/${encodeURIComponent(String(props.user.id))}/image`)
    : undefined,
)
const initials = computed(() =>
  name.value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join(''),
)

const kpis = computed(() => {
  const played = gpIds.value.length
  const their = average(theirs.value)
  const my = average(mine.value)
  const total = them.value?.points ?? 0
  const theirWon = won(theirResume.data.value)
  const myWon = won(myResume.data.value)
  const names = common.value?.map((c) => c.name).join(', ')
  return [
    {
      key: 'points',
      label: t('userProfile.kpi.points', { year: year.value }),
      value: formatPoints(total),
      delta: them.value
        ? them.value.place === 1
          ? t('userProfile.kpi.leader')
          : ordinal(them.value.place, gender.value)
        : undefined,
    },
    {
      key: 'average',
      label: t('userProfile.kpi.average'),
      value: played ? formatAvg(their) : '—',
      delta: played ? t('userProfile.kpi.averageYou', { n: formatAvg(my) }) : undefined,
    },
    {
      key: 'won',
      label: t('userProfile.kpi.won'),
      value: theirWon != null ? formatNumber(theirWon) : '—',
      delta: myWon != null ? t('userProfile.kpi.wonYou', { n: formatNumber(myWon) }) : undefined,
    },
    {
      key: 'common',
      label: t('userProfile.kpi.common'),
      value: common.value ? formatNumber(common.value.length) : '—',
      delta: common.value
        ? names || t('userProfile.kpi.commonNone')
        : theirCommunities.isError.value
          ? t('userProfile.kpi.commonUnavailable')
          : undefined,
    },
  ]
})
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <Breadcrumb
      v-if="!mobile"
      :items="[{ label: t('userProfile.crumbRanking'), to: base }, { label: name }]"
    />

    <section
      class="bg-surface ring-card-ring flex flex-wrap items-center gap-6 rounded-lg p-4 shadow-(--card-shadow) ring-1 sm:p-6"
      data-testid="profile-header"
    >
      <span
        class="bg-series-2 inline-flex size-22 flex-none items-center justify-center overflow-hidden rounded-full text-[30px] font-bold text-white"
        data-testid="profile-avatar"
      >
        <AppImage
          v-if="photo"
          :src="photo"
          alt=""
          :width="88"
          :height="88"
          class="size-full object-cover"
          @error="photoFailed = true"
        />
        <span v-else aria-hidden="true">{{ initials }}</span>
      </span>
      <div class="flex min-w-[260px] flex-1 flex-col gap-1">
        <PTitle>{{ name }}</PTitle>
        <p class="text-muted m-0 text-sm">{{ meta }}</p>
        <p v-if="user.bio" class="text-body m-0 text-sm">{{ user.bio }}</p>
        <div v-if="them && isMember" class="mt-1 flex flex-wrap gap-2">
          <PTag color="ok">{{
            t('userProfile.header.place', {
              place: ordinal(them.place, gender),
              community: community?.name ?? '',
            })
          }}</PTag>
        </div>
      </div>
      <PButton v-if="headToHead && isMember" :to="h2hTo" icon="right-left" class="max-sm:w-full">
        {{ t('userProfile.header.headToHead') }}
      </PButton>
    </section>

    <ErrorState
      v-if="standings.error.value"
      :what="t('userProfile.error.duel')"
      :error="standings.error.value"
      @retry="standings.refetch()"
    />
    <template v-else-if="standings.isLoading.value || scope.seasonQ.isLoading.value">
      <Skeleton variant="card" />
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton v-for="n in 4" :key="n" variant="line" :lines="2" />
      </div>
    </template>
    <section
      v-else-if="!isMember"
      class="bg-info-tint text-info-fg flex items-start gap-3 rounded-lg p-4 text-sm"
      role="status"
    >
      <PIcon name="circle-info" :size="20" />
      <div>
        <p class="m-0 font-bold">{{ t('userProfile.notMember.title') }}</p>
        <p class="m-0">
          {{ t('userProfile.notMember.text', { name, community: community?.name ?? '' }) }}
        </p>
      </div>
    </section>
    <template v-else>
      <DuelCard
        :year="year"
        :name="name"
        :me-label="
          t('userProfile.duel.you', { place: me ? ordinal(me.place, session.user?.gender) : '—' })
        "
        :them-label="
          t('userProfile.duel.them', {
            name,
            place: them ? ordinal(them.place, gender) : '—',
          })
        "
        :me-total="formatPoints(me?.points ?? 0)"
        :them-total="formatPoints(them?.points ?? 0)"
        :duel="duel"
        :cum="cum"
        :gp-names="gpNames"
        :mine="mine"
        :theirs="theirs"
        :me-form="me?.form ?? []"
        :them-form="them?.form ?? []"
      />

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="k in kpis"
          :key="k.key"
          class="bg-surface ring-card-ring min-w-0 rounded-lg shadow-(--card-shadow) ring-1"
        >
          <Kpi :label="k.label" :value="k.value" :delta="k.delta" />
        </div>
      </div>

      <div
        class="bg-info-tint text-info-fg flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
        role="status"
      >
        <PIcon name="eye" :size="20" />
        <p class="m-0">
          {{ t('userProfile.notice.closedOnly') }}
          <RouterLink
            v-if="predictionsTo && closed"
            :to="predictionsTo"
            class="font-semibold underline"
          >
            {{ t('userProfile.notice.link', { gp: gpShortName(closed.gp) }) }}
          </RouterLink>
        </p>
      </div>
    </template>
  </div>
</template>
