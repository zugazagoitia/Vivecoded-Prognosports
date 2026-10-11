<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsRoot } from 'reka-ui'
import ConfirmLeaveDialog from '@/components/data/ConfirmLeaveDialog.vue'
import GpHeader from '@/components/gp/GpHeader.vue'
import GpRulesCard from '@/components/gp/GpRulesCard.vue'
import DriverPool from '@/components/predict/DriverPool.vue'
import PredictClose from '@/components/predict/PredictClose.vue'
import PredictMobile from '@/components/predict/PredictMobile.vue'
import PredictShortcuts from '@/components/predict/PredictShortcuts.vue'
import PredictSlots from '@/components/predict/PredictSlots.vue'
import PredictTabs from '@/components/predict/PredictTabs.vue'
import { usePredict } from '@/components/predict/usePredict'
import { ErrorState, Skeleton } from '@/components/states'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { MOBILE_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { useMobileBackHref, useMobileTitle } from '@/composables/useMobileNav'
import { isSprintWeekend } from '@/lib/circuits'
import { formatPoints, gpPath, sessionPath, weekendState } from '@/lib/gp'
import { capitalize } from '@/lib/predict'

definePage({
  meta: {
    layout: 'app',
    title: 'route.predict',
    guards: ['auth', 'verified', 'community'],
  },
})

const { t } = useI18n()
const route = useRoute('/gps/[competicion]/[temporada]/[gp]/pronosticar/[sesion]')
const router = useRouter()
const mobile = useMediaQuery(MOBILE_QUERY)

const param = (name: 'competicion' | 'temporada' | 'gp' | 'sesion') =>
  String(route.params[name] ?? '')

// `reactive` unwraps the refs so the components read plain values.
const vm = reactive(
  usePredict(
    () => param('competicion'),
    () => param('temporada'),
    () => param('gp'),
    () => param('sesion'),
  ),
)

useMobileTitle(() => (vm.gp ? t('gp.mobileTitle', { name: vm.shortName }) : undefined))
useMobileBackHref(() => (vm.gp ? gpPath(vm.gp) : undefined))

/** Selected tab = session id in the URL; changing it replaces the history entry. */
const selected = computed({
  get: () => param('sesion'),
  set: (v: string) => void router.replace({ params: { ...route.params, sesion: v } }),
})
const selectTab = (id: number) => (selected.value = String(id))

const tzMode = ref<'mine' | 'circuit'>('mine')
const subtitle = computed(() => {
  const gp = vm.gp
  if (!gp) return ''
  return [gp.circuit?.name ?? gp.name, gp.laps ? t('predict.laps', { n: gp.laps }) : '']
    .filter(Boolean)
    .join(' · ')
})

const closedTitle = computed(() =>
  t(vm.label?.article === 'el' ? 'predict.closed.titleM' : 'predict.closed.titleF', {
    session: capitalize(vm.label?.withArticle ?? ''),
  }),
)
const closedText = computed(() => {
  const c = vm.closedInfo
  if (!c) return ''
  if (c.scored && c.has) {
    return c.points != null
      ? c.max != null
        ? t('predict.closed.scoredMax', { n: formatPoints(c.points), max: formatPoints(c.max) })
        : t('predict.closed.scored', { n: formatPoints(c.points) })
      : t('predict.closed.waitingPoints')
  }
  if (c.scored) return t('predict.closed.scoredNone')
  return c.has ? t('predict.closed.waiting') : t('predict.closed.none')
})

const failedWhat = computed(() => (vm.failed ? t(`predict.error.${vm.failed.what}`) : ''))
const slotsReadonly = computed(() => vm.readOnlyDraft)
</script>

<template>
  <div class="pg-main flex flex-col" :class="mobile ? 'gap-4 px-4 pt-4' : 'gap-6'">
    <template v-if="vm.notFound">
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('gp.home'), to: '/home' },
          { label: t('gp.list'), to: '/gps' },
          { label: t('predict.notFound.title') },
        ]"
      />
      <section class="flex flex-col items-center gap-3 py-12 text-center">
        <PTitle>{{ t('predict.notFound.title') }}</PTitle>
        <p class="text-muted max-w-md">{{ t('predict.notFound.text') }}</p>
        <PButton :to="vm.gp ? gpPath(vm.gp) : '/gps'" icon="flag">{{
          vm.gp ? t('predict.notFound.toGp') : t('gp.notFound.action')
        }}</PButton>
      </section>
    </template>

    <template v-else>
      <Breadcrumb
        v-if="!mobile"
        :items="[
          { label: t('gp.home'), to: '/home' },
          { label: t('gp.list'), to: '/gps' },
          vm.gp ? { label: vm.shortName, to: gpPath(vm.gp) } : { label: t('loading') },
          { label: t('predict.title') },
        ]"
      />

      <ErrorState
        v-if="vm.failed"
        :what="failedWhat"
        :error="vm.failed.error"
        @retry="vm.failed.retry()"
      />
      <div v-else-if="vm.loading || !vm.gp || !vm.session" class="flex flex-col gap-4">
        <h1 class="sr-only">{{ t('loading') }}</h1>
        <Skeleton variant="line" :lines="3" class="max-w-xl" />
        <div class="grid grid-cols-2 gap-1.5 min-[901px]:grid-cols-4" aria-hidden="true">
          <div v-for="i in 4" :key="i" class="skel h-14 rounded-lg" />
        </div>
        <div
          class="grid gap-4 min-[1181px]:grid-cols-[360px_minmax(0,1fr)_300px]"
          aria-hidden="true"
        >
          <div class="skel h-[420px] rounded-lg" />
          <div class="skel h-[420px] rounded-lg" />
          <div class="skel h-[260px] rounded-lg" />
        </div>
      </div>
      <PrognoAlert
        v-else-if="vm.noPositions"
        variant="warn"
        :title="t('predict.noPositions.title')"
      >
        {{ t('predict.noPositions.text') }}
      </PrognoAlert>

      <template v-else>
        <GpHeader
          v-model:tz="tzMode"
          :gp="vm.gp"
          :total-rounds="vm.gp.season?.totalEvents ?? vm.gp.round ?? 0"
          :sprint="isSprintWeekend(vm.gp)"
          :weekend="weekendState(vm.sessions, vm.now)"
          :subtitle="subtitle"
          :previous="vm.detail.previous"
          :next="vm.detail.next"
          :can-circuit-tz="false"
          :mobile="mobile"
        />
        <h2 class="sr-only">{{ t('predict.title') }}: {{ vm.label?.long }}</h2>

        <TabsRoot v-model="selected" class="flex flex-col" :class="mobile ? 'gap-4' : 'gap-6'">
          <PredictTabs
            :tabs="vm.tabs"
            :selected="vm.session.id"
            :mobile="mobile"
            @select="selectTab"
          />

          <TabsContent :value="selected" class="outline-none">
            <!-- Closed (on arrival, or it closed and nothing was being edited) -->
            <PrognoAlert v-if="vm.closed && !slotsReadonly" variant="info" :title="closedTitle">
              <span>{{ closedText }}</span>
              {{ ' ' }}
              <RouterLink
                :to="sessionPath(vm.gp, 'resultados', vm.session)"
                class="text-link inline-flex min-h-11 items-center underline"
                >{{ t('predict.closed.results') }}</RouterLink
              >
            </PrognoAlert>

            <!-- Phone -->
            <div v-else-if="mobile" class="flex flex-col gap-4">
              <PredictClose
                mobile
                :closes-in="vm.closesIn"
                :day="vm.close?.day"
                :time="vm.close?.time"
                :soon="vm.soon"
                :session-name="vm.label?.withArticle"
              />
              <PredictMobile :vm="vm" :readonly="slotsReadonly" />
              <PredictShortcuts
                v-if="!slotsReadonly"
                block
                :shortcuts="vm.shortcuts"
                @apply="vm.applyShortcut"
              />
              <PrognoAlert variant="info" :title="t('predict.privacy')" />
            </div>

            <!-- Desktop / tablet -->
            <div
              v-else
              class="grid grid-cols-1 items-start gap-4 min-[761px]:grid-cols-2 min-[1181px]:grid-cols-[360px_minmax(0,1fr)_300px]"
            >
              <DriverPool
                v-if="!slotsReadonly"
                :drivers="vm.pool"
                :grid="vm.gridPos"
                :used="vm.used"
                @pick="vm.pick"
              />
              <PredictSlots
                :vm="vm"
                :readonly="slotsReadonly"
                :class="slotsReadonly ? 'min-[761px]:col-span-2' : ''"
              />
              <aside
                class="flex min-w-0 flex-col gap-4 min-[761px]:col-span-2 min-[1181px]:col-span-1"
              >
                <PredictClose
                  :closes-in="vm.closesIn"
                  :day="vm.close?.day"
                  :time="vm.close?.time"
                  :soon="vm.soon"
                />
                <PredictShortcuts
                  v-if="!slotsReadonly"
                  :shortcuts="vm.shortcuts"
                  @apply="vm.applyShortcut"
                />
                <GpRulesCard
                  :ruleset="vm.ruleset.forGp.data"
                  :season-ruleset-id="vm.ruleset.forSeason.data?.id"
                  :session="vm.session"
                  :loading="vm.ruleset.forGp.isLoading"
                  :error="vm.ruleset.forGp.error"
                  @retry="vm.ruleset.forGp.refetch()"
                />
              </aside>
            </div>
          </TabsContent>
        </TabsRoot>
      </template>
    </template>

    <!-- Announcements for assistive technology (saved, missing drivers, moves, closing). -->
    <div class="sr-only" data-live role="status" aria-live="polite" aria-atomic="true">
      {{ vm.announce }}
    </div>

    <ConfirmLeaveDialog
      :open="vm.unsaved.open"
      @stay="vm.unsaved.stay()"
      @leave="vm.unsaved.leave()"
    />
    <ConfirmLeaveDialog
      :open="vm.switchGuard.open"
      @stay="vm.switchGuard.stay()"
      @leave="vm.switchGuard.leave()"
    />
  </div>
</template>
