<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import GeneralTable from '@/components/simulator/GeneralTable.vue'
import PointsCard from '@/components/simulator/PointsCard.vue'
import ResultCard from '@/components/simulator/ResultCard.vue'
import ScenarioChips from '@/components/simulator/ScenarioChips.vue'
import { useSimulator } from '@/components/simulator/useSimulator'
import { EmptyState, ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileTitle } from '@/composables/useMobileNav'
import { gpPath, sessionLabel, sessionPath } from '@/lib/gp'

definePage({
  meta: {
    layout: 'app',
    title: 'route.simulator',
    guards: ['auth', 'verified', 'community'],
    backHref: '/gps',
  },
})

const { t } = useI18n()
const route = useRoute('/gps/[competicion]/[temporada]/[gp]/simulador/[sesion]')
const mobile = useMediaQuery(MOBILE_QUERY)
const p = (name: 'competicion' | 'temporada' | 'gp' | 'sesion') => String(route.params[name] ?? '')

/** `?semilla=` makes «Caos» reproducible (tests, sharing a scenario); random otherwise. */
const seed = () => {
  const n = Number(route.query.semilla)
  return Number.isFinite(n) && route.query.semilla != null ? n : undefined
}

const s = useSimulator(
  () => p('competicion'),
  () => p('temporada'),
  () => p('gp'),
  () => p('sesion'),
  seed,
)
const { r } = s
const { gp, session } = r

useMobileTitle(() => t('simulator.mobileTitle'))

const sessionName = computed(() => (session.value ? sessionLabel(session.value).long : ''))
const gpHref = computed(() => (gp.value ? gpPath(gp.value) : '/gps'))
const crumbs = computed(() => [
  { label: t('gp.home'), to: '/home' },
  { label: t('gp.list'), to: '/gps' },
  { label: r.shortName.value || t('loading'), to: gp.value ? gpHref.value : undefined },
  { label: t('simulator.crumb') },
])
const blocking = computed(() => r.detail.notFound.value || r.sessionNotFound.value)
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="blocking">
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{
          r.detail.notFound.value
            ? t('simulator.notFound.gpTitle')
            : t('simulator.notFound.sessionTitle')
        }}</PTitle>
        <p class="text-muted max-w-md">
          {{
            r.detail.notFound.value
              ? t('simulator.notFound.gpText')
              : t('simulator.notFound.sessionText')
          }}
        </p>
        <PButton :to="r.detail.notFound.value ? '/gps' : gpHref" icon="flag">{{
          t('simulator.notFound.action')
        }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb v-if="!mobile" :items="crumbs" />

      <ErrorState
        v-if="r.detail.isError.value"
        :what="t('simulator.error.gp')"
        :error="r.detail.error.value"
        @retry="r.detail.refetch()"
      />
      <div v-else-if="!gp || !session" class="flex flex-col gap-6">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="2" class="max-w-xl" />
        <Skeleton variant="table" :rows="8" />
      </div>

      <template v-else>
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-1">
            <PTitle>{{ t('simulator.title') }}</PTitle>
            <p class="text-muted">
              {{ t('simulator.subtitle', { session: sessionName, gp: r.shortName.value }) }}
            </p>
          </div>
          <ScenarioChips
            v-if="s.initialised.value && s.hasMine.value"
            :active="s.scenario.value"
            :available="s.available.value"
            @pick="s.apply"
          />
        </header>

        <ErrorState
          v-if="r.error.value"
          :what="t('simulator.error.data')"
          :error="r.error.value"
          @retry="r.refetch()"
        />
        <div v-else-if="r.loading.value || (s.hasMine.value && !s.initialised.value)" class="grid2">
          <PCard :padded="true"><Skeleton variant="table" :rows="8" /></PCard>
          <PCard :padded="true"><Skeleton variant="table" :rows="12" /></PCard>
        </div>

        <PCard v-else-if="!s.hasMine.value" :padded="false">
          <EmptyState
            icon="edit_calendar"
            :title="t('simulator.empty.title')"
            :text="t('simulator.empty.text')"
          >
            <PButton :to="sessionPath(gp, 'pronosticar', session)" icon="pen-to-square">{{
              t('simulator.empty.action')
            }}</PButton>
          </EmptyState>
        </PCard>

        <template v-else>
          <PrognoAlert v-if="s.calcError.value" variant="warn" :title="t('simulator.error.calc')" />
          <p v-if="s.noGrid.value" class="text-muted text-[13px]">{{ t('simulator.noGrid') }}</p>
          <div class="grid2 items-start">
            <ResultCard
              :rows="s.rowsVm.value"
              :drivers="s.drivers.value"
              :mine-codes="s.mineCodes.value"
              @select="s.select"
              @move="s.move"
            />
            <div class="flex min-w-0 flex-col gap-6">
              <PointsCard
                :total="s.myScore.value.total"
                :max="s.maxPoints.value"
                :exacts="s.myScore.value.exacts"
                :place="s.place.value"
                :players="s.withPick.value"
                :me="s.me.value"
                :leader-total="s.leaderTotal.value"
                :recalculating="s.recalculating.value"
                :locked="!s.othersVisible.value"
              />
              <GeneralTable
                v-if="s.othersVisible.value && s.standings.value.length"
                :rows="s.standings.value"
                :session="sessionName"
                :recalculating="s.recalculating.value"
              />
              <PCard v-else-if="!s.othersVisible.value" tag="section" :padded="false">
                <EmptyState
                  icon="lock"
                  :title="t('simulator.general.locked.title')"
                  :text="t('simulator.general.locked.text')"
                />
              </PCard>
              <PrognoAlert
                v-else-if="!r.beforeLoading.value"
                variant="warn"
                :title="t('simulator.general.error')"
              />
            </div>
          </div>
        </template>
      </template>
    </template>
  </div>
</template>
