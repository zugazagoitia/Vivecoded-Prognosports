<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsRoot } from 'reka-ui'
import GpCircuitCard from '@/components/gp/GpCircuitCard.vue'
import GpCommunityCard from '@/components/gp/GpCommunityCard.vue'
import GpConsensus from '@/components/gp/GpConsensus.vue'
import GpGrid from '@/components/gp/GpGrid.vue'
import GpGridCard from '@/components/gp/GpGridCard.vue'
import GpHeader from '@/components/gp/GpHeader.vue'
import GpHistoryCard from '@/components/gp/GpHistoryCard.vue'
import GpPredictionCard from '@/components/gp/GpPredictionCard.vue'
import GpPromo from '@/components/gp/GpPromo.vue'
import GpRulesCard from '@/components/gp/GpRulesCard.vue'
import GpSessionRows from '@/components/gp/GpSessionRows.vue'
import GpSessionTabs from '@/components/gp/GpSessionTabs.vue'
import { useGpWeekend } from '@/components/gp/useGpWeekend'
import HistoryBars from '@/components/gp/HistoryBars.vue'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { circuitShortName, formatPoints, lapDistance, sessionLabel, sessionPath } from '@/lib/gp'
import { formatKm, raceDistance } from '@/lib/circuitDetail'

definePage({
  meta: {
    layout: 'app',
    title: 'route.gp',
    guards: ['auth', 'verified', 'community'],
    backHref: '/gps',
  },
})

const { t } = useI18n()
const route = useRoute('/gps/[competicion]/[temporada]/[gp]/')
const router = useRouter()
const mobile = useMediaQuery(MOBILE_QUERY)

const param = (name: 'competicion' | 'temporada' | 'gp') => String(route.params[name] ?? '')
const wanted = computed(() => {
  const v = route.query.sesion
  const x = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' ? x : undefined
})

const w = useGpWeekend(
  () => param('competicion'),
  () => param('temporada'),
  () => param('gp'),
  wanted,
)
const { detail, gp } = w

useMobileTitle(() => (gp.value ? t('gp.mobileTitle', { name: w.shortName.value }) : undefined))

/** Selected tab = session id, kept in `?sesion=` (replace: no history entry per tab). */
const selectedValue = computed({
  get: () => (w.selected.value ? String(w.selected.value.id) : ''),
  set: (v: string) => void router.replace({ query: { ...route.query, sesion: v } }),
})

const subtitle = computed(() => {
  if (!gp.value) return ''
  const place = mobile.value
    ? circuitShortName(gp.value.circuit)
    : (gp.value.circuit?.name ?? gp.value.name)
  return `${place} · ${w.dateRange(mobile.value)}`
})

const members = computed(() => w.actor.members.value ?? undefined)
const circuitId = computed(() => gp.value?.circuit?.id)
const historyName = computed(() => circuitShortName(gp.value?.circuit))
const gridTitle = computed(() =>
  t(w.gridKind.value === 'sprint' ? 'gp.grid.mobileTitle' : 'gp.grid.mobileTitleCarrera'),
)
const consensusSession = computed(() =>
  w.lastClosed.value ? sessionLabel(w.lastClosed.value.session).short : '',
)
const mobilePoints = computed(() =>
  w.history.value.entries.map((e) => formatPoints(e.points)).join(' · '),
)
const lapKm = computed(() => (gp.value ? lapDistance(gp.value) : undefined))
const homeTo = '/home'

const summary = computed(() =>
  t('gp.sessions.summary', { done: w.done.value, total: w.vms.value.length, tz: w.tzName.value }),
)
const detailsClass =
  'group bg-surface ring-card-ring rounded-lg shadow-(--card-shadow) ring-1 open:pb-1'
const summaryClass =
  'text-heading flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold marker:hidden [&::-webkit-details-marker]:hidden'
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="detail.notFound.value">
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('gp.home'), to: homeTo },
          { label: t('gp.list'), to: '/gps' },
          { label: t('gp.notFound.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{ t('gp.notFound.title') }}</PTitle>
        <p class="text-muted max-w-md">{{ t('gp.notFound.text') }}</p>
        <PButton to="/gps" icon="flag">{{ t('gp.notFound.action') }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('gp.home'), to: homeTo },
          { label: t('gp.list'), to: '/gps' },
          { label: gp ? w.shortName.value : t('loading') },
        ]"
      />

      <ErrorState
        v-if="detail.isError.value"
        :what="t('gp.error.gp')"
        :error="detail.error.value"
        @retry="detail.refetch()"
      />
      <div v-else-if="!gp" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="3" class="max-w-xl" />
        <div class="skel h-[260px] rounded-lg" aria-hidden="true" />
      </div>

      <template v-else>
        <GpHeader
          v-model:tz="w.tzMode.value"
          :gp="gp"
          :total-rounds="detail.totalRounds.value"
          :sprint="w.sprint.value"
          :weekend="w.weekendState.value"
          :no-results="!w.vms.value.some((v) => v.state === 'scored')"
          :subtitle="subtitle"
          :previous="detail.previous.value"
          :next="detail.next.value"
          :can-circuit-tz="w.canCircuitTz.value"
          :mobile="mobile"
        />

        <!-- Desktop / tablet -->
        <TabsRoot
          v-if="!mobile && w.selectedVm.value"
          v-model="selectedValue"
          class="flex flex-col gap-6"
        >
          <section
            :aria-label="t('gp.sessions.label')"
            class="bg-surface ring-card-ring grid grid-cols-1 overflow-hidden rounded-lg shadow-(--card-shadow) ring-1 min-[901px]:grid-cols-[300px_minmax(0,1fr)]"
          >
            <GpPromo :gp="gp" />
            <div class="flex min-w-0 flex-col">
              <div class="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
                <h2 class="t-header text-heading">{{ t('gp.sessions.title') }}</h2>
                <span class="text-muted text-sm">{{ summary }}</span>
              </div>
              <GpSessionTabs :sessions="w.vms.value" :label="t('gp.sessions.label')" />
            </div>
          </section>

          <div class="split">
            <div class="flex min-w-0 flex-col gap-6">
              <TabsContent :value="selectedValue" class="outline-none">
                <GpPredictionCard
                  :gp="gp"
                  :vm="w.selectedVm.value"
                  :cells="w.cells.value"
                  :close-text="w.closing.value"
                  :loading="w.weekend.isLoading.value"
                  :error="w.weekend.error.value"
                  @retry="w.weekend.refetch()"
                />
              </TabsContent>
              <GpGridCard
                :kind="w.gridKind.value"
                :grid="w.gridSession.value ? w.grid.data.value : []"
                :loading="w.grid.isLoading.value"
                :error="w.grid.error.value"
                @retry="w.grid.refetch()"
              />
            </div>
            <aside class="flex min-w-0 flex-col gap-6">
              <GpCommunityCard
                :members="members"
                :points="w.communityPoints.data.value"
                :user-id="w.actor.userId.value"
                :loading="w.communityPoints.isLoading.value"
                :error="w.communityPoints.error.value"
                @retry="w.communityPoints.refetch()"
              />
              <GpCircuitCard :gp="gp" />
              <GpHistoryCard
                v-if="
                  w.history.value.entries.length ||
                  w.history.value.isLoading ||
                  w.history.value.error
                "
                :name="historyName"
                :entries="w.history.value.entries"
                :best="w.history.value.best"
                :loading="w.history.value.isLoading"
                :error="w.history.value.error"
                @retry="w.history.value.refetch()"
              />
              <GpRulesCard
                :ruleset="w.rulesets.forGp.data.value"
                :season-ruleset-id="w.rulesets.forSeason.data.value?.id"
                :session="w.selected.value"
                :loading="w.rulesets.forGp.isLoading.value"
                :error="w.rulesets.forGp.error.value"
                @retry="w.rulesets.forGp.refetch()"
              />
            </aside>
          </div>
        </TabsRoot>

        <!-- Phone -->
        <template v-else-if="mobile && w.selectedVm.value">
          <GpSessionRows
            :gp="gp"
            :sessions="w.vms.value"
            :selected-id="w.selected.value?.id"
            :done="w.done.value"
            @select="selectedValue = String($event)"
          />

          <details :class="detailsClass" open>
            <summary :class="summaryClass">
              {{ gridTitle }}
              <PIcon
                name="chevron-down"
                :size="20"
                class="transition-transform group-open:rotate-180"
              />
            </summary>
            <div class="px-4 pb-4">
              <Skeleton v-if="w.grid.isLoading.value" variant="line" :lines="6" />
              <ErrorState
                v-else-if="w.grid.error.value"
                :what="t('gp.error.grid')"
                :error="w.grid.error.value"
                @retry="w.grid.refetch()"
              />
              <GpGrid
                v-else-if="w.gridSession.value && w.grid.data.value?.length"
                :grid="w.grid.data.value"
                compact
              />
              <EmptyState
                v-else
                icon="sports_score"
                :title="t('gp.grid.empty.title')"
                :text="t('gp.grid.empty.text')"
              />
            </div>
          </details>

          <details v-if="w.lastClosed.value" :class="detailsClass">
            <summary :class="summaryClass">
              {{ t('gp.consensus.title', { session: consensusSession }) }}
              <PIcon
                name="chevron-down"
                :size="20"
                class="transition-transform group-open:rotate-180"
              />
            </summary>
            <div class="flex flex-col gap-3 px-4 pb-4">
              <Skeleton v-if="w.lastClosedTipps.isLoading.value" variant="line" :lines="3" />
              <ErrorState
                v-else-if="w.lastClosedTipps.isError.value"
                :error="w.lastClosedTipps.error.value"
                @retry="w.lastClosedTipps.refetch()"
              />
              <GpConsensus
                v-else
                :predictions="w.lastClosedTipps.data.value ?? []"
                :members="members ?? 0"
              />
              <PButton
                :to="sessionPath(gp, 'consenso', w.lastClosed.value.session)"
                variant="soft"
                block
                >{{ t('gp.consensus.view') }}</PButton
              >
            </div>
          </details>

          <details :class="detailsClass">
            <summary :class="summaryClass">
              {{ t('gp.history.mobileTitle') }}
              <PIcon
                name="chevron-down"
                :size="20"
                class="transition-transform group-open:rotate-180"
              />
            </summary>
            <dl class="m-0 flex flex-col gap-2 px-4 pb-4 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-muted">{{ t('gp.circuit.length') }}</dt>
                <dd class="text-heading m-0 font-semibold tabular-nums">
                  {{ formatKm(lapKm, 3) }}
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">{{ t('gp.circuit.laps') }}</dt>
                <dd class="text-heading m-0 font-semibold tabular-nums">{{ gp.laps ?? '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">{{ t('gp.circuit.distance') }}</dt>
                <dd class="text-heading m-0 font-semibold tabular-nums">
                  {{ formatKm(raceDistance(lapKm, gp.laps), 1) }}
                </dd>
              </div>
            </dl>
            <div
              v-if="w.history.value.entries.length"
              class="flex flex-col gap-2 px-4 pb-2 text-sm"
            >
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ t('gp.history.mobilePoints') }}</span>
                <b class="text-heading font-semibold tabular-nums">{{ mobilePoints }}</b>
              </div>
              <HistoryBars :entries="w.history.value.entries" :name="historyName" />
            </div>
            <RouterLink
              v-if="circuitId"
              :to="`/circuits/${circuitId}`"
              class="text-link inline-flex min-h-11 items-center px-4 text-sm"
              >{{ t('gp.circuit.more') }}</RouterLink
            >
          </details>
        </template>
      </template>
    </template>
  </div>
</template>
