<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ConsensusCard from '@/components/consensus/ConsensusCard.vue'
import ConsensusCircuitCard from '@/components/consensus/ConsensusCircuitCard.vue'
import ConsensusGridCard from '@/components/consensus/ConsensusGridCard.vue'
import ConsensusKpis from '@/components/consensus/ConsensusKpis.vue'
import ConsensusLocked from '@/components/consensus/ConsensusLocked.vue'
import { useConsensus } from '@/components/consensus/useConsensus'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PTitle from '@/components/ui/PTitle.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { useNow } from '@/composables/useNow'
import {
  closeInfo,
  gpPath,
  gpShortName,
  gridSessionFor,
  sessionLabel,
  sessionPath,
  sortedSessions,
  teamColor,
  userTimeZone,
} from '@/lib/gp'
import {
  useGpDetail,
  useSessionGrid,
  useSessionResults,
  useSessionTipps,
  type GpArgs,
} from '@/queries/gp'
import { useCommunityMembers } from '@/queries/community'
import { useCommunityStore } from '@/stores/community'
import { useSessionStore } from '@/stores/session'
import { isClosed } from '@/utils/dates'

definePage({
  meta: {
    layout: 'app',
    title: 'route.consensus',
    guards: ['auth', 'verified', 'community'],
    backHref: '/gps',
  },
})

const { t } = useI18n()
const route = useRoute('/gps/[competicion]/[temporada]/[gp]/consenso/[sesion]')
const router = useRouter()
const mobile = useMediaQuery(MOBILE_QUERY)
const now = useNow(15_000)
const user = useSessionStore()
const community = useCommunityStore()

const param = (name: 'competicion' | 'temporada' | 'gp' | 'sesion') =>
  String(route.params[name] ?? '')

const detail = useGpDetail(
  () => param('competicion'),
  () => param('temporada'),
  () => param('gp'),
)
const gp = detail.gp
const args = computed<GpArgs | undefined>(() =>
  gp.value
    ? {
        competition: gp.value.competition?.id ?? param('competicion'),
        season: gp.value.season?.id ?? param('temporada'),
        gp: gp.value.id,
      }
    : undefined,
)
const sessions = computed(() => (gp.value ? sortedSessions(gp.value) : []))
const session = computed(() => sessions.value.find((s) => String(s.id) === param('sesion')))
const sessionId = computed(() => session.value?.id)
const sessionNotFound = computed(() => gp.value != null && !session.value)

/**
 * Other players' predictions are private until the session closes (6.8): while it is open no
 * request for them (tipps, results) is made at all.
 */
const locked = computed(() => session.value != null && !isClosed(session.value, now.value))
const visible = computed(() => session.value != null && !locked.value)

const gridSession = computed(() => gridSessionFor(sessions.value, session.value))
const grid = useSessionGrid(args, () => gridSession.value?.id)
const results = useSessionResults(args, sessionId, visible)
const tipps = useSessionTipps(args, sessionId, visible)
const members = useCommunityMembers(
  () => community.activeId ?? '',
  () => visible.value,
)
const names = computed(() => new Map((members.data.value ?? []).map((m) => [m.id, m.username])))

const c = useConsensus({
  tipps: () => (visible.value ? tipps.data.value : undefined),
  mine: () => tipps.mine.value,
  names: () => names.value,
  grid: () => (gridSession.value ? grid.data.value : undefined),
  results: () => (visible.value ? results.data.value : undefined),
  resetKey: sessionId,
})

const shortName = computed(() => (gp.value ? gpShortName(gp.value) : ''))
const sessionName = computed(() => (session.value ? sessionLabel(session.value).long : ''))
const subtitle = computed(() =>
  t(locked.value ? 'consensus.subtitleOpen' : 'consensus.subtitle', {
    gp: shortName.value,
    session: sessionName.value,
    community: community.active?.name ?? '',
  }),
)
useMobileTitle(() => (gp.value ? t('consensus.mobileTitle') : undefined))

const sessionOptions = computed(() =>
  sessions.value.map((s) => ({ value: s.id, label: sessionLabel(s).long })),
)
const selectedSession = computed({
  get: () => session.value?.id ?? 0,
  set: (id: number) => {
    if (gp.value && id !== session.value?.id)
      void router.push(sessionPath(gp.value, 'consenso', { id }))
  },
})

const lockedText = computed(() => {
  if (!session.value) return ''
  const info = closeInfo(session.value, userTimeZone(user.user?.timeZone), now.value)
  if (!info) return t('consensus.locked.noDate')
  return info.today
    ? t('consensus.locked.today', { time: info.time })
    : t('consensus.locked.day', { weekday: info.weekday, time: info.time })
})
const hasPrediction = computed(() => tipps.mine.value.length > 0)

const gridError = computed(() => (grid.isError.value ? grid.error.value : undefined))
const noTipps = computed(
  () => visible.value && tipps.isSuccess.value && c.predictions.value.length === 0,
)
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="detail.notFound.value || sessionNotFound">
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('consensus.home'), to: '/home' },
          { label: t('consensus.list'), to: '/gps' },
          { label: t('consensus.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{
          detail.notFound.value ? t('gp.notFound.title') : t('consensus.notFound.session.title')
        }}</PTitle>
        <p class="text-muted max-w-md">
          {{ detail.notFound.value ? t('gp.notFound.text') : t('consensus.notFound.session.text') }}
        </p>
        <PButton :to="detail.notFound.value || !gp ? '/gps' : gpPath(gp)" icon="flag">{{
          detail.notFound.value ? t('gp.notFound.action') : t('consensus.notFound.session.action')
        }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('consensus.home'), to: '/home' },
          { label: t('consensus.list'), to: '/gps' },
          { label: gp ? shortName : t('loading'), to: gp ? gpPath(gp) : undefined },
          { label: t('consensus.title') },
        ]"
      />

      <ErrorState
        v-if="detail.isError.value"
        :what="t('gp.error.gp')"
        :error="detail.error.value"
        @retry="detail.refetch()"
      />
      <div v-else-if="!gp || !session" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="3" class="max-w-xl" />
        <div class="skel h-[260px] rounded-lg" aria-hidden="true" />
      </div>

      <template v-else>
        <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div class="flex min-w-0 flex-col gap-1">
            <PTitle>{{ t('consensus.title') }}</PTitle>
            <p class="text-muted m-0">{{ subtitle }}</p>
          </div>
          <SegmentedControl
            v-model="selectedSession"
            :options="sessionOptions"
            :label="t('consensus.sessionGroup')"
          />
        </header>

        <div class="grid grid-cols-1 items-start gap-5 min-[981px]:grid-cols-[380px_minmax(0,1fr)]">
          <ConsensusGridCard
            :grid="gridSession ? grid.data.value : []"
            :selected-id="c.driverId.value"
            :highlight="c.view.value === 'drv'"
            :loading="grid.isLoading.value"
            :error="gridError"
            @select="c.select"
            @retry="grid.refetch()"
          />

          <div class="flex min-w-0 flex-col gap-6">
            <ConsensusLocked
              v-if="locked"
              :text="lockedText"
              :predict-to="sessionPath(gp, 'pronosticar', session)"
              :has-prediction="hasPrediction"
            />
            <PCard v-else-if="tipps.isLoading.value" :title="t('consensus.card.title')">
              <Skeleton variant="line" :lines="8" />
            </PCard>
            <ErrorState
              v-else-if="tipps.isError.value"
              :what="t('consensus.card.error')"
              :error="tipps.error.value"
              @retry="tipps.refetch()"
            />
            <PCard v-else-if="noTipps">
              <EmptyState
                icon="groups"
                :title="t('consensus.empty.title')"
                :text="t('consensus.empty.text')"
              />
            </PCard>
            <template v-else>
              <ConsensusCard
                v-model:view="c.view.value"
                :rows="c.rows.value"
                :bars="c.bars.value"
                :players="c.players.value"
                :has-results="c.hasResults.value"
                :driver-name="c.driverName.value"
                :starts-from="c.startsFrom.value"
                :driver-color="teamColor(c.driver.value)"
                :finish-text="c.finishText.value"
                :results-to="sessionPath(gp, 'resultados', session)"
              />
              <ConsensusKpis
                :top="c.top.value"
                :original="c.original.value"
                :agree="c.agree.value"
                :players="c.players.value"
              />
            </template>
            <ConsensusCircuitCard :gp="gp" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
